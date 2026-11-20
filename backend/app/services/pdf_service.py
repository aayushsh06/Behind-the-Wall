"""Render one wall as a PDF laid out like a well-made invoice.

A header with the record number and revision, the parties (homeowner, who recorded it)
and the wall, the annotated photo, a line-item table of everything found, notes beside a
summary box, and a footer with page numbers. Set in Manrope, the app's typeface
(bundled in app/fonts, SIL Open Font License).

The PDF is built from the wall's current saved state every time it is requested, so a
tradesperson's edit is reflected in the homeowner's PDF as soon as it is saved. The
revision number and "last updated" line make each version identifiable.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models import Photo, Wall
from app.schemas import Coverage, MarkerKind, WallRead
from app.services.export_service import UTILITY_COLORS, UTILITY_LABELS, ExportBundle, ExportService
from app.services.geometry import (
    describe_marker,
    describe_wall_size,
    format_length,
    path_midpoint,
    physical_line,
    physical_path_length,
)

FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"
REGULAR, MEDIUM, SEMIBOLD, BOLD = "Manrope", "Manrope-Medium", "Manrope-SemiBold", "Manrope-Bold"
for _name, _file in (
    (REGULAR, "Manrope-Regular.ttf"),
    (MEDIUM, "Manrope-Medium.ttf"),
    (SEMIBOLD, "Manrope-SemiBold.ttf"),
    (BOLD, "Manrope-Bold.ttf"),
):
    pdfmetrics.registerFont(TTFont(_name, str(FONTS_DIR / _file)))
pdfmetrics.registerFontFamily(
    REGULAR, normal=REGULAR, bold=SEMIBOLD, italic=REGULAR, boldItalic=SEMIBOLD
)

INK = colors.HexColor("#16181c")
MUTED = colors.HexColor("#555a62")
FAINT = colors.HexColor("#6b7078")
LINE = colors.HexColor("#e2e3e6")
SOFT = colors.HexColor("#f5f5f6")
BRAND = colors.HexColor("#f2a900")
MARGIN = 0.65 * inch
PAGE_W, PAGE_H = LETTER
# SimpleDocTemplate's frame pads its contents by 6 pt on each side; tables are sized to
# what is left so they line up with paragraphs (and the footer with both).
FRAME_PAD = 6
CONTENT_W = PAGE_W - 2 * MARGIN - 2 * FRAME_PAD
LEFT_X, RIGHT_X = MARGIN + FRAME_PAD, PAGE_W - MARGIN - FRAME_PAD
COURSE_LINE = "Human-Centered Software Design & Development Project | Fall 2026"

COVERAGE_TEXT = {
    Coverage.FULL: "Whole wall",
    Coverage.PARTIAL: "Part of the wall. The hatched area wasn’t opened; treat it as unknown.",
    Coverage.NONE: "Not opened. Treat the whole wall as unknown.",
}


def _fmt_date(value: datetime) -> str:
    """Server timestamps are UTC; say so, since the reader may be in another time zone."""
    moment = value if value.tzinfo else value.replace(tzinfo=UTC)
    return moment.astimezone(UTC).strftime("%b %-d, %Y, %H:%M UTC")


def _record_number(record: WallRead) -> str:
    return f"BTW-{record.id[-8:].upper()}"


@dataclass(frozen=True)
class _Pin:
    index: int
    color: str
    x: float
    y: float
    x2: float | None = None
    y2: float | None = None
    path: tuple[tuple[float, float], ...] | None = None


@dataclass(frozen=True)
class _XY:
    x: float
    y: float


class AnnotatedPhoto(Flowable):
    """The wall photo with not-inspected area, wall outline, line runs, and numbered pins."""

    def __init__(self, image: bytes, aspect: float, max_width: float, max_height: float, record):
        super().__init__()
        self._image = ImageReader(BytesIO(image))
        self.width = max_width
        self.height = max_width / aspect
        if self.height > max_height:
            self.height = max_height
            self.width = max_height * aspect
        self._record: WallRead = record

    def _pt(self, x: float, y: float) -> tuple[float, float]:
        return x * self.width, self.height - y * self.height

    def draw(self) -> None:
        c = self.canv
        # Rounded corners, like the app's photo frames.
        c.saveState()
        frame = c.beginPath()
        frame.roundRect(0, 0, self.width, self.height, 10)
        c.clipPath(frame, stroke=0, fill=0)
        c.drawImage(self._image, 0, 0, self.width, self.height)
        record = self._record

        region = record.uncovered_region
        if region is not None:
            x0, y1 = self._pt(region.x, region.y)
            x1, y0 = self._pt(region.x + region.width, region.y + region.height)
            c.saveState()
            path = c.beginPath()
            path.rect(x0, y0, x1 - x0, y1 - y0)
            c.clipPath(path, stroke=0, fill=0)
            c.setFillColor(colors.Color(1, 0.78, 0.31, alpha=0.35))
            c.rect(x0, y0, x1 - x0, y1 - y0, stroke=0, fill=1)
            c.setStrokeColor(colors.HexColor("#b45309"))
            c.setLineWidth(1)
            span = (x1 - x0) + (y1 - y0)
            step = 8
            for offset in range(0, int(span) + step, step):
                c.line(x0 + offset, y0, x0 + offset - (y1 - y0), y1)
            c.restoreState()
            c.setStrokeColor(colors.HexColor("#b45309"))
            c.setLineWidth(1.5)
            c.rect(x0, y0, x1 - x0, y1 - y0, stroke=1, fill=0)
            label = "Not inspected"
            c.setFont(SEMIBOLD, 8)
            tw = c.stringWidth(label, SEMIBOLD, 8)
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            c.setFillColor(INK)
            c.roundRect(cx - tw / 2 - 6, cy - 6.5, tw + 12, 14, 7, stroke=0, fill=1)
            c.setFillColor(colors.white)
            c.drawCentredString(cx, cy - 2.5, label)

        cal = record.calibration
        if cal is not None:
            x0, y1 = self._pt(cal.top_left.x, cal.top_left.y)
            x1, y0 = self._pt(cal.bottom_right.x, cal.bottom_right.y)
            c.saveState()
            c.setStrokeColor(colors.white)
            c.setLineWidth(1.2)
            c.setDash(4, 3)
            c.rect(x0, y0, x1 - x0, y1 - y0, stroke=1, fill=0)
            c.restoreState()

        pins = [
            _Pin(
                i + 1,
                UTILITY_COLORS[m.type.value],
                m.x,
                m.y,
                m.x2,
                m.y2,
                tuple((p.x, p.y) for p in m.points) if m.points else None,
            )
            for i, m in enumerate(record.markers)
        ]
        for pin in pins:
            if pin.path:
                self._polyline(pin.path, pin.color)
                continue
            if pin.x2 is None or pin.y2 is None:
                continue
            a, b = self._pt(pin.x, pin.y), self._pt(pin.x2, pin.y2)
            c.setLineCap(1)
            c.setStrokeColor(colors.white)
            c.setLineWidth(5)
            c.line(*a, *b)
            c.setStrokeColor(colors.HexColor(pin.color))
            c.setLineWidth(3)
            c.line(*a, *b)
        for pin in pins:
            if pin.path:
                mx, my = path_midpoint([_XY(x, y) for x, y in pin.path])
                px, py = self._pt(mx, my)
            elif pin.x2 is not None and pin.y2 is not None:
                px, py = self._pt((pin.x + pin.x2) / 2, (pin.y + pin.y2) / 2)
            else:
                px, py = self._pt(pin.x, pin.y)
            c.setFillColor(colors.HexColor(pin.color))
            c.setStrokeColor(colors.white)
            c.setLineWidth(1.5)
            c.circle(px, py, 8, stroke=1, fill=1)
            c.setFillColor(colors.white)
            c.setFont(BOLD, 8)
            c.drawCentredString(px, py - 2.8, str(pin.index))
        c.restoreState()

    def _polyline(self, path: tuple[tuple[float, float], ...], color: str) -> None:
        c = self.canv
        for stroke, width in ((colors.white, 5), (colors.HexColor(color), 3)):
            line = c.beginPath()
            line.moveTo(*self._pt(*path[0]))
            for x, y in path[1:]:
                line.lineTo(*self._pt(x, y))
            c.setLineCap(1)
            c.setLineJoin(1)
            c.setStrokeColor(stroke)
            c.setLineWidth(width)
            c.drawPath(line, stroke=1, fill=0)


class _Logo(Flowable):
    """The app's mark (a wall with a hatched cutaway) and the name, drawn as vectors."""

    def __init__(self) -> None:
        super().__init__()
        self.width, self.height = 2.2 * inch, 26

    def draw(self) -> None:
        c = self.canv
        size = 24
        c.setFillColor(INK)
        c.roundRect(0, 1, size, size, 6.5, stroke=0, fill=1)
        cut_x, cut_y, cut = 11, 1 + size - 3 - 10, 10
        c.saveState()
        clip = c.beginPath()
        clip.roundRect(cut_x, cut_y, cut, cut, 2.2)
        c.clipPath(clip, stroke=0, fill=0)
        c.setFillColor(BRAND)
        c.rect(cut_x, cut_y, cut, cut, stroke=0, fill=1)
        c.setStrokeColor(INK)
        c.setLineWidth(1.3)
        for offset in (-6, 0, 6):
            c.line(cut_x + offset, cut_y, cut_x + offset + cut + 4, cut_y + cut + 4)
        c.restoreState()
        c.setFillColor(INK)
        c.setFont(SEMIBOLD, 13)
        c.drawString(size + 8, 8, "Behind the Wall")


class _Swatch(Flowable):
    """A small hatched square, the app's sign for 'not inspected'."""

    def __init__(self, size: float = 9) -> None:
        super().__init__()
        self.width = self.height = size

    def draw(self) -> None:
        c = self.canv
        s = self.width
        c.saveState()
        clip = c.beginPath()
        clip.roundRect(0, 0, s, s, 1.5)
        c.clipPath(clip, stroke=0, fill=0)
        c.setFillColor(colors.HexColor("#fcf1d2"))
        c.rect(0, 0, s, s, stroke=0, fill=1)
        c.setStrokeColor(BRAND)
        c.setLineWidth(0.9)
        for offset in range(-int(s), int(s) * 2, 3):
            c.line(offset, 0, offset + s, s)
        c.restoreState()


class _Legend(Flowable):
    """Colour key under the photo: a dot per item type, plus the hatch if used."""

    def __init__(self, entries: list[tuple[str, str]], hatched: bool, width: float) -> None:
        super().__init__()
        self.entries, self.hatched = entries, hatched
        self.width, self.height = width, 12

    def draw(self) -> None:
        c = self.canv
        x = 2
        c.setFont(REGULAR, 8)
        for color, label in self.entries:
            c.setFillColor(colors.HexColor(color))
            c.circle(x + 3.5, 4.5, 3.5, stroke=0, fill=1)
            c.setFillColor(MUTED)
            c.drawString(x + 11, 2, label)
            x += 11 + c.stringWidth(label, REGULAR, 8) + 16
        if self.hatched:
            _Swatch(8).drawOn(c, x, 0.5)
            c.setFillColor(MUTED)
            c.setFont(REGULAR, 8)
            c.drawString(x + 12, 2, "Not inspected")


class _NumberedCanvas(pdfcanvas.Canvas):
    """Draws the footer on every page once the total page count is known."""

    footer_left = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pages: list[dict] = []

    def showPage(self):  # noqa: N802 (ReportLab API)
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for state in self._pages:
            self.__dict__.update(state)
            self._footer(total)
            super().showPage()
        super().save()

    def _footer(self, total: int) -> None:
        self.saveState()
        self.setStrokeColor(LINE)
        self.setLineWidth(0.6)
        self.line(LEFT_X, 0.62 * inch, RIGHT_X, 0.62 * inch)
        self.setFont(REGULAR, 7.5)
        self.setFillColor(FAINT)
        self.drawString(LEFT_X, 0.45 * inch, self.footer_left)
        self.drawRightString(RIGHT_X, 0.45 * inch, f"Page {self._pageNumber} of {total}")
        self.drawString(LEFT_X, 0.3 * inch, COURSE_LINE)
        self.restoreState()


class PdfService:
    def __init__(self) -> None:
        self.s = {
            "title": ParagraphStyle(
                "title",
                fontName=SEMIBOLD,
                fontSize=20,
                leading=24,
                textColor=INK,
                alignment=TA_RIGHT,
            ),
            "wall": ParagraphStyle(
                "wall", fontName=SEMIBOLD, fontSize=16, leading=20, textColor=INK
            ),
            "label": ParagraphStyle(
                "label", fontName=MEDIUM, fontSize=8, leading=11, textColor=FAINT
            ),
            "value": ParagraphStyle(
                "value", fontName=REGULAR, fontSize=9.5, leading=13.5, textColor=INK
            ),
            "strong": ParagraphStyle(
                "strong", fontName=SEMIBOLD, fontSize=9.5, leading=13.5, textColor=INK
            ),
            "meta_label": ParagraphStyle(
                "meta_label",
                fontName=REGULAR,
                fontSize=8.5,
                leading=12,
                textColor=FAINT,
                alignment=TA_RIGHT,
            ),
            "meta_value": ParagraphStyle(
                "meta_value",
                fontName=MEDIUM,
                fontSize=8.5,
                leading=12,
                textColor=INK,
                alignment=TA_RIGHT,
            ),
            "section_keep": ParagraphStyle(
                "section_keep",
                fontName=SEMIBOLD,
                fontSize=11,
                leading=14,
                textColor=INK,
                spaceBefore=4,
                spaceAfter=8,
                keepWithNext=1,
            ),
            "section": ParagraphStyle(
                "section",
                fontName=SEMIBOLD,
                fontSize=11,
                leading=14,
                textColor=INK,
                spaceBefore=4,
                spaceAfter=8,
            ),
            "cell": ParagraphStyle(
                "cell", fontName=REGULAR, fontSize=8.5, leading=11.5, textColor=INK
            ),
            "cell_muted": ParagraphStyle(
                "cell_muted", fontName=REGULAR, fontSize=8.5, leading=11.5, textColor=MUTED
            ),
            "cell_head": ParagraphStyle(
                "cell_head", fontName=MEDIUM, fontSize=8, leading=11, textColor=FAINT
            ),
            "cell_right": ParagraphStyle(
                "cell_right",
                fontName=REGULAR,
                fontSize=8.5,
                leading=11.5,
                textColor=INK,
                alignment=TA_RIGHT,
            ),
            "head_right": ParagraphStyle(
                "head_right",
                fontName=MEDIUM,
                fontSize=8,
                leading=11,
                textColor=FAINT,
                alignment=TA_RIGHT,
            ),
            "num": ParagraphStyle(
                "num",
                fontName=BOLD,
                fontSize=8,
                leading=11,
                textColor=colors.white,
                alignment=TA_CENTER,
            ),
            "small": ParagraphStyle(
                "small", fontName=REGULAR, fontSize=8, leading=11, textColor=FAINT
            ),
            "body": ParagraphStyle(
                "body", fontName=REGULAR, fontSize=9.5, leading=14, textColor=INK
            ),
        }

    def to_pdf(self, wall: Wall, photo: Photo | None, photo_bytes: bytes | None) -> ExportBundle:
        record = WallRead.model_validate(wall)
        buffer = BytesIO()
        title = f"{record.room} · {record.label}"
        doc = SimpleDocTemplate(
            buffer,
            pagesize=LETTER,
            leftMargin=MARGIN,
            rightMargin=MARGIN,
            topMargin=MARGIN,
            bottomMargin=0.85 * inch,
            title=f"Wall record {_record_number(record)}: {title}",
            author=record.author,
            subject="Behind the Wall wall record",
            creator="Behind the Wall",
        )
        story: list[Flowable] = [self._header(record), Spacer(1, 10), self._rule(), Spacer(1, 16)]
        story.append(Paragraph(escape(record.label), self.s["wall"]))
        story.append(Paragraph(escape(record.room), self.s["value"]))
        story.append(Spacer(1, 14))
        story.append(self._parties(record))
        story.append(Spacer(1, 12))
        story.append(self._inspected(record))

        # A tall (portrait) photo sits beside the summary and notes instead of leaving half
        # the page empty; a wide one spans the page and the summary closes the record.
        portrait = photo is not None and photo_bytes is not None and photo.width < photo.height
        if photo is not None and photo_bytes is not None:
            story.append(Spacer(1, 16))
            aspect = photo.width / photo.height
            if portrait:
                story.append(self._photo_beside_summary(record, photo_bytes, aspect))
            else:
                story.append(AnnotatedPhoto(photo_bytes, aspect, CONTENT_W, 3.9 * inch, record))
                legend = self._legend(record, CONTENT_W)
                if legend is not None:
                    story += [Spacer(1, 6), legend]

        story.append(Spacer(1, 18))
        story.append(Paragraph(f"Items ({len(record.markers)})", self.s["section_keep"]))
        if record.markers:
            story.append(self._items_table(record))
            if record.calibration:
                story.append(Spacer(1, 5))
                story.append(
                    Paragraph(
                        "Positions are measured from the wall’s left edge and the floor, computed "
                        "from the wall corners marked in the photo. They are approximate; confirm "
                        "before cutting or drilling.",
                        self.s["small"],
                    )
                )
        else:
            story.append(Paragraph("No items were recorded for this wall.", self.s["cell_muted"]))

        if not portrait:
            story.append(Spacer(1, 18))
            story.append(KeepTogether([self._closing(record)]))

        number = _record_number(record)
        footer = f"Behind the Wall  ·  Wall record {number}  ·  Revision {record.revision}"
        canvas_class = type("_Canvas", (_NumberedCanvas,), {"footer_left": footer})
        doc.build(story, canvasmaker=canvas_class)
        return ExportBundle(
            filename=ExportService._filename(record, "pdf").replace(
                ".pdf", f"-rev{record.revision}.pdf"
            ),
            content=buffer.getvalue(),
            media_type="application/pdf",
        )

    # ---- sections --------------------------------------------------------------------

    def _rule(self) -> Table:
        rule = Table([[""]], colWidths=[CONTENT_W], rowHeights=[2])
        rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BRAND)]))
        return rule

    def _header(self, record: WallRead) -> Table:
        meta = [
            ("Record no.", _record_number(record)),
            ("Revision", str(record.revision)),
            ("Issued", _fmt_date(datetime.now(UTC))),
            ("Last updated", _fmt_date(record.updated_at)),
        ]
        if record.last_edited_by is not None:
            meta.append(("Updated by", record.last_edited_by.name))
        meta_table = Table(
            [
                [Paragraph(k, self.s["meta_label"]), Paragraph(escape(v), self.s["meta_value"])]
                for k, v in meta
            ],
            colWidths=[0.95 * inch, 2.45 * inch],
        )
        meta_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ]
            )
        )
        right = Table(
            [[Paragraph("Wall record", self.s["title"])], [Spacer(1, 6)], [meta_table]],
            colWidths=[3.4 * inch],
        )
        right.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        header = Table([[_Logo(), right]], colWidths=[CONTENT_W - 3.4 * inch, 3.4 * inch])
        header.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return header

    def _block(self, label: str, lines: list[str], strong_first: bool = True) -> list[Flowable]:
        out: list[Flowable] = [Paragraph(label, self.s["label"]), Spacer(1, 3)]
        for i, line in enumerate(lines):
            out.append(
                Paragraph(escape(line), self.s["strong" if strong_first and i == 0 else "value"])
            )
        return out

    def _parties(self, record: WallRead) -> Table:
        if record.owner is not None:
            homeowner = [record.owner.name, record.owner.email]
        elif record.pending_owner_email:
            homeowner = [record.pending_owner_email, "Invited, not yet joined"]
        else:
            homeowner = ["Not assigned"]
        recorded = [record.author]
        if record.created_by is not None:
            if record.created_by.name != record.author:
                recorded.append(record.created_by.name)
            recorded.append(record.created_by.email)
        wall = [
            f"Observed {record.observed_date.strftime('%b %-d, %Y')}",
            f"Size {describe_wall_size(record.calibration)}"
            if record.calibration
            else "Size not recorded",
        ]
        width = CONTENT_W / 3
        table = Table(
            [
                [
                    self._block("Homeowner", homeowner),
                    self._block("Recorded by", recorded),
                    self._block("Wall", wall, strong_first=False),
                ]
            ],
            colWidths=[width] * 3,
        )
        table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return table

    def _inspected(self, record: WallRead) -> Table:
        coverage = escape(COVERAGE_TEXT[record.coverage])
        text = f"<font name='{SEMIBOLD}'>Inspected</font>&nbsp;&nbsp;{coverage}"
        if record.coverage_note:
            text += f"<br/><font color='#555a62'>{escape(record.coverage_note)}</font>"
        hatched = record.coverage is not Coverage.FULL
        cells = (
            [[_Swatch(), Paragraph(text, self.s["value"])]]
            if hatched
            else [[Paragraph(text, self.s["value"])]]
        )
        # The swatch column holds a 9 pt square plus its own padding.
        widths = [24, CONTENT_W - 24] if hatched else [CONTENT_W]
        box = Table(cells, colWidths=widths)
        style = [
            ("BACKGROUND", (0, 0), (-1, -1), SOFT),
            ("ROUNDEDCORNERS", [6, 6, 6, 6]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]
        if hatched:
            style += [
                ("RIGHTPADDING", (0, 0), (0, -1), 0),
                ("LEFTPADDING", (1, 0), (1, -1), 5),
                ("TOPPADDING", (0, 0), (0, -1), 10),
            ]
        box.setStyle(TableStyle(style))
        return box

    def _legend(self, record: WallRead, width: float) -> Flowable | None:
        types: list[str] = []
        for m in record.markers:
            if m.type.value not in types:
                types.append(m.type.value)
        if not types:
            return None
        entries = [(UTILITY_COLORS[t], UTILITY_LABELS[t]) for t in types]
        return _Legend(entries, hatched=record.uncovered_region is not None, width=width)

    def _length(self, record: WallRead, marker) -> str:
        cal = record.calibration
        if cal is None or marker.kind is MarkerKind.POINT:
            return "—"
        if marker.kind is MarkerKind.PATH and marker.points:
            return format_length(physical_path_length(marker.points, cal), cal.unit)
        if marker.x2 is not None and marker.y2 is not None:
            return format_length(
                physical_line(marker.x, marker.y, marker.x2, marker.y2, cal).length, cal.unit
            )
        return "—"

    def _items_table(self, record: WallRead) -> Table:
        s = self.s
        head = [
            Paragraph("#", s["cell_head"]),
            Paragraph("Item", s["cell_head"]),
            Paragraph("Position", s["cell_head"]),
            Paragraph("Length", s["head_right"]),
            Paragraph("Measurement", s["cell_head"]),
            Paragraph("Measured from", s["cell_head"]),
            Paragraph("Note", s["cell_head"]),
        ]
        rows = [head]
        for i, m in enumerate(record.markers):
            kind = "run" if m.kind in (MarkerKind.LINE, MarkerKind.PATH) else "point"
            position = describe_marker(m, record.calibration) or "—"
            rows.append(
                [
                    Paragraph(str(i + 1), s["num"]),
                    Paragraph(
                        f"<font name='{SEMIBOLD}'>{UTILITY_LABELS[m.type.value]}</font><br/>"
                        f"<font color='#6b7078'>{kind}</font>",
                        s["cell"],
                    ),
                    Paragraph(escape(position), s["cell_muted"]),
                    Paragraph(self._length(record, m), s["cell_right"]),
                    Paragraph(escape(m.measurement) or "—", s["cell"]),
                    Paragraph(escape(m.reference_point) or "—", s["cell_muted"]),
                    Paragraph(escape(m.note) or "—", s["cell_muted"]),
                ]
            )
        fractions = [0.05, 0.11, 0.27, 0.09, 0.18, 0.14, 0.16]
        table = Table(rows, colWidths=[f * CONTENT_W for f in fractions], repeatRows=1)
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), SOFT),
            ("LINEBELOW", (0, 0), (-1, 0), 0.6, LINE),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]
        for i, m in enumerate(record.markers, start=1):
            color = colors.HexColor(UTILITY_COLORS[m.type.value])
            style.append(("BACKGROUND", (0, i), (0, i), color))
        table.setStyle(TableStyle(style))
        return table

    def _notes(self, record: WallRead) -> list[Flowable]:
        s = self.s
        notes: list[Flowable] = [Paragraph("Notes", s["section"])]
        if record.notes:
            notes.append(Paragraph(escape(record.notes).replace("\n", "<br/>"), s["body"]))
        else:
            notes.append(Paragraph("No notes.", s["cell_muted"]))
        return notes

    def _summary(self, record: WallRead, width: float = 2.7 * inch) -> Table:
        """The record's totals, like the totals box on an invoice."""
        s = self.s
        runs = [m for m in record.markers if m.kind is not MarkerKind.POINT]
        points = len(record.markers) - len(runs)
        run_text = str(len(runs))
        if runs and record.calibration:
            total = 0.0
            cal = record.calibration
            for m in runs:
                if m.kind is MarkerKind.PATH and m.points:
                    total += physical_path_length(m.points, cal)
                elif m.x2 is not None and m.y2 is not None:
                    total += physical_line(m.x, m.y, m.x2, m.y2, cal).length
            run_text += f"  ({format_length(total, cal.unit)} total)"
        summary_rows = [
            ("Items recorded", str(len(record.markers))),
            ("Runs", run_text),
            ("Points", str(points)),
            (
                "Inspected",
                {"full": "Whole wall", "partial": "Partly", "none": "Not opened"}[
                    record.coverage.value
                ],
            ),
        ]
        summary = Table(
            [
                [Paragraph(k, s["cell_muted"]), Paragraph(v, s["cell_right"])]
                for k, v in summary_rows
            ],
            colWidths=[1.2 * inch, width - 1.2 * inch],
        )
        summary.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                    ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        return summary

    def _closing(self, record: WallRead) -> Table:
        """Notes on the left, the summary box on the right."""
        layout = Table(
            [[self._notes(record), self._summary(record)]],
            colWidths=[CONTENT_W - 2.9 * inch, 2.9 * inch],
        )
        layout.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (0, 0), 18),
                    ("RIGHTPADDING", (1, 0), (1, 0), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return layout

    def _photo_beside_summary(self, record: WallRead, photo_bytes: bytes, aspect: float) -> Table:
        photo_w = min(3.3 * inch, 4.6 * inch * aspect)
        gap = 22
        side_w = CONTENT_W - photo_w - gap
        left: list[Flowable] = [AnnotatedPhoto(photo_bytes, aspect, photo_w, 4.6 * inch, record)]
        legend = self._legend(record, photo_w)
        if legend is not None:
            left += [Spacer(1, 6), legend]
        right: list[Flowable] = [
            Paragraph("Summary", self.s["section"]),
            self._summary(record, side_w),
            Spacer(1, 16),
            *self._notes(record),
        ]
        layout = Table([[left, right]], colWidths=[photo_w + gap, side_w])
        layout.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return layout
