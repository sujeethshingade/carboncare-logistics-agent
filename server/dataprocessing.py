import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union
from datetime import datetime
from pydantic import BaseModel, validator
import logging
from concurrent.futures import ThreadPoolExecutor
from abc import ABC, abstractmethod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PackageData(BaseModel):
    package_id: str
    material_type: str
    weight: float
    dimensions: Dict[str, float]
    recyclable: bool

    @validator('weight')
    def validate_weight(cls, v):
        if v <= 0:
            raise ValueError('Weight must be positive')
        return v

class ShipmentData(BaseModel):
    shipment_id: str
    origin: Dict[str, float]  # lat, long
    destination: Dict[str, float]
    transport_mode: str
    packages: List[PackageData]
    timestamp: datetime

class DataProcessor(ABC):
    @abstractmethod
    def process(self, data: Union[dict, pd.DataFrame]):
        pass

    @abstractmethod
    def validate(self, data: Union[dict, pd.DataFrame]) -> bool:
        pass
