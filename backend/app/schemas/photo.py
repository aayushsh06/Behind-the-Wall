from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PhotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    content_type: str
    width: int
    height: int
    size_bytes: int
    created_at: datetime
