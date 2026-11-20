"""Render one wall as a PDF: the annotated photo, the item list, and the record details.

The PDF is built from the wall's current saved state every time it is requested, so a
tradesperson's edit is reflected in the homeowner's PDF as soon as it is saved. The
revision number and "last updated" line make each version identifiable.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
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
from app.schemas import MarkerKind, WallRead
from app.services.export_service import UTILITY_COLORS, UTILITY_LABELS, ExportBundle, ExportService
from app.services.geometry import describe_marker, describe_wall_size, path_midpoint

INK = colors.HexColor("#1b2330")
MUTED = colors.HexColor("#4a5462")
LINE = colors.HexColor("#d8dce1")
ACCENT = colors.HexColor("#1f4f7a")
COVERAGE_STYLES = {
    "full": ("#ecfdf3", "#16a34a", "#14532d", "Entire wall documented."),
    "partial": (
        "#fffbeb",
        "#f59e0b",
        "#78350f",
        "Part of this wall is undocumented. Unmarked areas are unknown.",
    ),
    "none": (
        "#fef2f2",
        "#dc2626",
        "#7f1d1d",
        "No photo or markers for this wall. Treat the whole wall as unknown.",
    ),
}
MARGIN = 0.6 * inch


def _fmt_date(value: datetime) -> str:
    """Server timestamps are UTC; say so, since the reader may be in another time zone."""
    moment = value if value.tzinfo else value.replace(tzinfo=UTC)
    return moment.astimezone(UTC).strftime("%b %-d, %Y %H:%M UTC")


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
            label = "NOT INSPECTED"
            c.setFont("Helvetica-Bold", 8)
            tw = c.stringWidth(label, "Helvetica-Bold", 8)
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            c.setFillColor(colors.HexColor("#b45309"))
            c.rect(cx - tw / 2 - 4, cy - 6, tw + 8, 13, stroke=0, fill=1)
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
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(px, py - 2.8, str(pin.index))

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


class PdfService:
    def __init__(self) -> None:
        base = getSampleStyleSheet()
        self._title = ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            alignment=0,
            textColor=INK,
            spaceAfter=4,
        )
        self._meta = ParagraphStyle(
            "meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=MUTED,
        )
        self._h2 = ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=INK,
            spaceBefore=12,
            spaceAfter=6,
        )
        self._cell = ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=INK,
        )
        self._cell_head = ParagraphStyle(
            "cellhead",
            parent=self._cell,
            fontName="Helvetica-Bold",
            textColor=MUTED,
        )
        self._num = ParagraphStyle(
            "num",
            parent=self._cell,
            fontName="Helvetica-Bold",
            textColor=colors.white,
            alignment=TA_CENTER,
        )
        self._body = ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=INK,
        )

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
            bottomMargin=MARGIN,
            title=title,
            author=record.author,
            subject="Behind the Wall record",
            creator="Behind the Wall",
        )
        width = LETTER[0] - 2 * MARGIN
        story: list[Flowable] = [Paragraph(escape(title), self._title)]
        story += [Paragraph(line, self._meta) for line in self._meta_lines(record)]
        story.append(Spacer(1, 10))
        story.append(self._coverage_box(record, width))

        if photo is not None and photo_bytes is not None:
            story.append(Spacer(1, 10))
            story.append(
                AnnotatedPhoto(photo_bytes, photo.width / photo.height, width, 4.6 * inch, record)
            )

        story.append(Paragraph(f"Items ({len(record.markers)})", self._h2))
        if record.markers:
            story.append(self._items_table(record, width))
            if record.calibration:
                story.append(Spacer(1, 4))
                story.append(
                    Paragraph(
                        "Positions are measured from the wall's left edge and the floor, computed "
                        "from the wall corners marked in the photo. They are approximate.",
                        self._meta,
                    )
                )
        else:
            story.append(Paragraph("No items recorded for this wall.", self._meta))

        if record.notes:
            story.append(
                KeepTogether(
                    [
                        Paragraph("Notes", self._h2),
                        Paragraph(escape(record.notes).replace("\n", "<br/>"), self._body),
                    ]
                )
            )

        footer = f"Behind the Wall  ·  {title}  ·  Revision {record.revision}"
        generated = f"Generated {_fmt_date(datetime.now(UTC))}"

        def decorate(canvas, document) -> None:
            canvas.saveState()
            canvas.setFont("Helvetica", 7.5)
            canvas.setFillColor(MUTED)
            canvas.setStrokeColor(LINE)
            canvas.line(MARGIN, 0.45 * inch, LETTER[0] - MARGIN, 0.45 * inch)
            canvas.drawString(MARGIN, 0.3 * inch, footer[:110])
            canvas.drawRightString(
                LETTER[0] - MARGIN, 0.3 * inch, f"{generated}  ·  Page {document.page}"
            )
            canvas.restoreState()

        doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
        return ExportBundle(
            filename=ExportService._filename(record, "pdf").replace(
                ".pdf", f"-rev{record.revision}.pdf"
            ),
            content=buffer.getvalue(),
            media_type="application/pdf",
        )

    @staticmethod
    def _meta_lines(record: WallRead) -> list[str]:
        lines = []
        if record.owner is not None:
            lines.append(
                f"Home of <b>{escape(record.owner.name)}</b> ({escape(record.owner.email)})"
            )
        elif record.pending_owner_email:
            lines.append(f"Sent to {escape(record.pending_owner_email)} (invited, not joined yet)")
        observed = record.observed_date.strftime("%b %-d, %Y")
        lines.append(f"Recorded by <b>{escape(record.author)}</b>, observed {observed}")
        updated = f"Revision {record.revision} · updated {_fmt_date(record.updated_at)}"
        if record.last_edited_by is not None:
            updated += f" by {escape(record.last_edited_by.name)}"
        lines.append(updated)
        if record.calibration:
            lines.append(f"Wall size: {escape(describe_wall_size(record.calibration))}")
        return lines

    def _coverage_box(self, record: WallRead, width: float) -> Table:
        bg, edge, ink, label = COVERAGE_STYLES[record.coverage.value]
        text = f"<b>{escape(label)}</b>"
        if record.coverage_note:
            text += f"<br/>{escape(record.coverage_note)}"
        style = ParagraphStyle("cov", parent=self._body, textColor=colors.HexColor(ink))
        box = Table([[Paragraph(text, style)]], colWidths=[width])
        box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                    ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor(edge)),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        return box

    def _items_table(self, record: WallRead, width: float) -> Table:
        head = ["#", "Type", "Position", "Measurement", "Measured from", "Note"]
        rows = [[Paragraph(h, self._cell_head) for h in head]]
        for i, m in enumerate(record.markers):
            is_run = m.kind in (MarkerKind.LINE, MarkerKind.PATH)
            kind = UTILITY_LABELS[m.type.value] + (" run" if is_run else "")
            position = describe_marker(m, record.calibration) or "—"
            rows.append(
                [
                    Paragraph(str(i + 1), self._num),
                    Paragraph(escape(kind), self._cell),
                    Paragraph(escape(position), self._cell),
                    Paragraph(escape(m.measurement) or "—", self._cell),
                    Paragraph(escape(m.reference_point) or "—", self._cell),
                    Paragraph(escape(m.note) or "—", self._cell),
                ]
            )
        fractions = [0.05, 0.11, 0.30, 0.18, 0.16, 0.20]
        table = Table(rows, colWidths=[f * width for f in fractions], repeatRows=1)
        style = [
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, LINE),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]
        for i, m in enumerate(record.markers, start=1):
            style.append(
                ("BACKGROUND", (0, i), (0, i), colors.HexColor(UTILITY_COLORS[m.type.value]))
            )
        table.setStyle(TableStyle(style))
        return table
