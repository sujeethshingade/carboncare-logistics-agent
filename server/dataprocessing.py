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

    # @validator('weight')
    # def validate_weight(cls, v):
    #     if v <= 0:
    #         raise ValueError('Weight must be positive')
    #     return v

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

# Data Processing Pipeline
class LogisticsSustainabilityPipeline:
    def __init__(self):
        self.processors: List[DataProcessor] = []
        self.error_handlers: Dict[str, callable] = {}
        self.enrichment_sources: Dict[str, callable] = {}

    def add_processor(self, processor: DataProcessor):
        self.processors.append(processor)

    def add_error_handler(self, error_type: str, handler: callable):
        self.error_handlers[error_type] = handler

    def add_enrichment_source(self, source_name: str, source_callable: callable):
        self.enrichment_sources[source_name] = source_callable

    async def process_data(self, raw_data: Union[dict, pd.DataFrame]) -> Dict:
        try:
            # 1. Initial Validation
            validated_data = await self._validate_data(raw_data)
            
            # 2. Data Enrichment
            enriched_data = await self._enrich_data(validated_data)
            
            # 3. Process through pipeline
            processed_data = await self._run_processors(enriched_data)
            
            # 4. Generate Analytics
            analytics_results = await self._generate_analytics(processed_data)
            
            return {
                'status': 'success',
                'processed_data': processed_data,
                'analytics': analytics_results
            }
            
        except Exception as e:
            logger.error(f"Error in processing pipeline: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    async def _validate_data(self, data: Union[dict, pd.DataFrame]) -> Union[dict, pd.DataFrame]:
        """Validate incoming data structure and content"""
        try:
            if isinstance(data, dict):
                ShipmentData(**data)
            elif isinstance(data, pd.DataFrame):
                # Validate required columns
                required_columns = {'shipment_id', 'origin', 'destination', 'transport_mode'}
                if not required_columns.issubset(data.columns):
                    raise ValueError(f"Missing required columns: {required_columns - set(data.columns)}")
            return data
        except Exception as e:
            if type(e).__name__ in self.error_handlers:
                return self.error_handlers[type(e).__name__](e, data)
            raise

    async def _enrich_data(self, data: Union[dict, pd.DataFrame]) -> Dict:
        """Enrich data with additional information from various sources"""
        enriched_data = data.copy() if isinstance(data, dict) else data.to_dict('records')[0]
        
        # Parallel enrichment processing
        with ThreadPoolExecutor() as executor:
            enrichment_futures = {
                source_name: executor.submit(source_callable, enriched_data)
                for source_name, source_callable in self.enrichment_sources.items()
            }
            
            # Collect results
            for source_name, future in enrichment_futures.items():
                try:
                    enriched_data[source_name] = future.result()
                except Exception as e:
                    logger.error(f"Error enriching data from {source_name}: {str(e)}")
                    
        return enriched_data

    async def _run_processors(self, data: Dict) -> Dict:
        """Run data through all processors in sequence"""
        processed_data = data
        for processor in self.processors:
            if processor.validate(processed_data):
                processed_data = processor.process(processed_data)
            else:
                logger.warning(f"Data validation failed for processor: {processor.__class__.__name__}")
        return processed_data

    async def _generate_analytics(self, data: Dict) -> Dict:
        """Generate analytics from processed data"""
        return {
            'sustainability_metrics': self._calculate_sustainability_metrics(data),
            'optimization_opportunities': self._identify_optimization_opportunities(data),
            'trend_analysis': self._analyze_trends(data)
        }

    def _calculate_sustainability_metrics(self, data: Dict) -> Dict:
        """Calculate various sustainability metrics"""
        return {
            'carbon_footprint': self._calculate_carbon_footprint(data),
            'resource_efficiency': self._calculate_resource_efficiency(data),
            'waste_reduction': self._calculate_waste_reduction(data),
            'energy_efficiency': self._calculate_energy_efficiency(data)
        }

    def _calculate_carbon_footprint(self, data: Dict) -> float:
        """Calculate carbon footprint based on shipment data"""
        # Example calculation - would be more complex in production
        distance = self._calculate_distance(data['origin'], data['destination'])
        transport_emissions = {
            'truck': 0.1,  # kg CO2 per km
            'train': 0.04,
            'ship': 0.02,
            'air': 0.5
        }
        return distance * transport_emissions.get(data['transport_mode'], 0.1)

    def _calculate_resource_efficiency(self, data: Dict) -> float:
        """Calculate resource efficiency score"""
        # TODO: Implementation 
        return 0.0

    def _calculate_waste_reduction(self, data: Dict) -> float:
        """Calculate waste reduction metrics"""
        # TODO: Implementation 
        return 0.0

    def _calculate_energy_efficiency(self, data: Dict) -> float:
        """Calculate energy efficiency metrics"""
        # TODO: Implementation 
        return 0.0

    def _calculate_distance(self, origin: Dict[str, float], destination: Dict[str, float]) -> float:
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in kilometers

        lat1, lon1 = origin['lat'], origin['long']
        lat2, lon2 = destination['lat'], destination['long']
        
        phi1, phi2 = np.radians(lat1), np.radians(lat2)
        delta_phi = np.radians(lat2 - lat1)
        delta_lambda = np.radians(lon2 - lon1)

        a = np.sin(delta_phi/2)**2 + \
            np.cos(phi1) * np.cos(phi2) * \
            np.sin(delta_lambda/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        
        return R * c

    def _identify_optimization_opportunities(self, data: Dict) -> List[Dict]:
        """Identify potential areas for optimization"""
        opportunities = []
        
        # Check for route optimization
        if self._can_optimize_route(data):
            opportunities.append({
                'type': 'route_optimization',
                'potential_impact': 'high',
                'description': 'Alternative route could reduce distance by 15%'
            })
            
        # Check for packaging optimization
        if self._can_optimize_packaging(data):
            opportunities.append({
                'type': 'packaging_optimization',
                'potential_impact': 'medium',
                'description': 'Using recyclable materials could reduce waste by 25%'
            })
            
        return opportunities

    def _analyze_trends(self, data: Dict) -> Dict:
        """Analyze trends in the data"""
        return {
            'historical_comparison': self._compare_historical_data(data),
            'seasonal_patterns': self._identify_seasonal_patterns(data),
            'anomalies': self._detect_anomalies(data)
        }
    
    def _can_optimize_route(self, data: Dict) -> bool:
        """
        Check if route can be optimized
        This needs to be improved
        """
        # Example optimization check 
        # You could add more complex logic here
        distance = self._calculate_distance(data['origin'], data['destination'])
        return distance > 500  # Example: suggest optimization for routes over 500 km

    def _can_optimize_packaging(self, data: Dict) -> bool:
        """
        Check if packaging can be optimized.
        This also needs to be improved
        """
        # Check packaging efficiency
        packages = data.get('packages', [])
        
        # Example checks:
        # 1. Check if any non-recyclable packages exist
        non_recyclable_packages = [p for p in packages if not p.get('recyclable', False)]
        
        # 2. Check if packages are inefficiently sized
        oversized_packages = [p for p in packages if any(
            dim > 50 for dim in p.get('dimensions', {}).values()
        )]
        
        return bool(non_recyclable_packages or oversized_packages)
    
    def _identify_seasonal_patterns(self, data: Dict) -> Dict:
        """
        TODO
        """
        return {
            'season': 'Not implemented',
            'patterns': []
        }

    def _detect_anomalies(self, data: Dict) -> List:
        """
        TODO
        """
        return []

    def _compare_historical_data(self, data: Dict) -> Dict:
        """
        TODO
        """
        return {
            'comparison_status': 'Not implemented'
        }


# Example Usage
async def run_pipeline():
    # Create pipeline instance
    pipeline = LogisticsSustainabilityPipeline()
    
    # Add custom processors
    class CarbonFootprintProcessor(DataProcessor):
        def process(self, data):
            # Process carbon footprint calculations
            return data
            
        def validate(self, data):
            return True
            
    pipeline.add_processor(CarbonFootprintProcessor())
    
    # Add enrichment sources
    def weather_enrichment(data):
        # Fetch weather data for route
        return {'weather_conditions': 'sunny'}
        
    pipeline.add_enrichment_source('weather', weather_enrichment)
    
    # Sample data
    sample_data = {
        'shipment_id': 'SHIP123',
        'origin': {'lat': 40.7128, 'long': -74.0060},
        'destination': {'lat': 34.0522, 'long': -118.2437},
        'transport_mode': 'truck',
        'packages': [{
            'package_id': 'PKG1',
            'material_type': 'cardboard',
            'weight': 10.5,
            'dimensions': {'length': 20, 'width': 15, 'height': 10},
            'recyclable': True
        }],
        'timestamp': datetime.now()
    }
    
    # Process data
    result = await pipeline.process_data(sample_data)
    return result

import asyncio

if __name__ == "__main__":
    async def main():
        # Run the pipeline
        result = await run_pipeline()
        
        # Print the results
        print("Pipeline Processing Result:")
        print("------------------------")
        for key, value in result.items():
            print(f"{key}: {value}")

    # Run the async main function
    asyncio.run(main())