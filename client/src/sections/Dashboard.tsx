import React, { useState, useEffect } from 'react';
import { useTheme } from '@/Context/ThemeContext';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Legend,
    AreaChart,
    Area,
    ResponsiveContainer,
} from 'recharts';
import { getLatestAnalytics, getAnalyticsHistory } from '@/lib/analytics-service';
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, X, Truck, Package, AlertTriangle, Boxes } from 'lucide-react';

interface Metrics {
    [key: string]: number | string;
}

interface Prediction {
    predicted_score: number;
    feature_importances: {
        [key: string]: number;
    };
    alternative_modes: string[];
    estimated_savings: number;
}

interface ProcessedData {
    transport_mode: string;
    [key: string]: string | number;
}

interface SustainabilityAnalysis {
    metrics: Metrics;
    overall_sustainability_score: number;
    predictions: Prediction;
    processed_data: {
        [x: string]: any;
        processed_data: ProcessedData;
    };
}

interface Result {
    processed_data: any;
    shipment_id: string;
    sustainability_analysis: SustainabilityAnalysis;
}

interface SustainabilityAnalytics {
    timestamp: string;
    num_shipments_analyzed: number;
    results: Result[];
}

interface KpiCardPropsType {
    title: string;
    value: string;
    icon: React.ReactNode;
    description?: string;
}
const KpiCard: React.FC<KpiCardPropsType> = ({
    title,
    value,
    icon,
}) => {
    const { theme }=useTheme();
    return (
        <Card className={`${theme === 'dark' ? 'bg-black' : 'bg-white'}  rounded-none`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <span className={`${theme === 'dark' ? 'text-white' : 'text-black'} `}>{icon}</span>
                    <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'} `}>{title}</h3>
                </div>
                <div className="space-y-1">
                    <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} `}>{value}</p>
                </div>
            </CardContent>
        </Card>
    );
};

interface ShippingKpiCardsProps {
    shipmentId: string;
    transportMode: string;
    overallSustainabilityScore: number;
    materialType: string;
}

const ShippingKpiCards: React.FC<ShippingKpiCardsProps> = ({
    shipmentId,
    transportMode,
    overallSustainabilityScore,
    materialType,
}) => {
    const data = [
        {
            title: 'Shipment ID',
            value: shipmentId,
            icon: <Package className="h-6 w-6" />,
        },
        {
            title: 'Shipment Mode',
            value: transportMode,
            icon: <Truck className="h-6 w-6" />,
        },
        {
            title: 'Overall Sustainability Score',
            value: overallSustainabilityScore.toFixed(2),
            icon: <AlertTriangle className="h-6 w-6" />,
        },
        {
            title: 'Material Type',
            value: materialType,
            icon: <Boxes className="h-6 w-6" />,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 mb-10">
            {data.map((item, index) => (
                <KpiCard
                    key={index}
                    title={item.title}
                    value={item.value}
                    icon={item.icon}
                />
            ))}
        </div>
    );
};

interface ChartData {
    sustainabilityScores: Array<{
        name: string;
        actual: number;
        predicted: number;
    }>;
    pieData: Array<{
        name: string;
        value: number;
    }>;
    radarData: Array<{
        subject: string;
        importance: number;
    }>;
    sustainabilityMetrics: Array<{
        timestamp: string;
        carbon_footprint: number;
        energy_efficiency: number;
        resource_efficiency: number;
        waste_reduction: number;
    }>;
}

const ShipmentSelector: React.FC<{
    shipments: string[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}> = ({ shipments, selectedId, onSelect }) => {
    const { theme }=useTheme();
    return (
        <select
            value={selectedId || ''}
            onChange={(e) => onSelect(e.target.value)}
            className={`p-2 border ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'} w-full cursor-pointer focus:border-primary [&>option]:${theme === 'dark' ? 'bg-black' : 'bg-white'} `}
        >
            {shipments.map((id) => (
                <option key={id} value={id}>
                    {id}
                </option>
            ))}
        </select>
    );
};

const ChartWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
    
}) =>{const { theme }=useTheme();
    return(
    <div className={`${theme === 'dark' ? 'bg-black' : 'bg-white'}  p-4 border`}>
        <h4 className={`${theme === 'dark' ? 'text-white' : 'text-black'}  mb-4 text-lg font-medium`}>{title}</h4>
        <div className="flex justify-center items-center">{children}</div>
    </div>
)};

export const Dashboard: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [latestData, setLatestData] = useState<SustainabilityAnalytics | null>(
        null
    );
    const [historyData, setHistoryData] = useState<SustainabilityAnalytics[]>(
        []
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);

    const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
        null
    );
    const [availableShipments, setAvailableShipments] = useState<string[]>([]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const latest = await getLatestAnalytics();
            setLatestData(latest);

            if (latest?.results) {
                const shipmentIds = latest.results.map((r: { shipment_id: any; }) => r.shipment_id);
                setAvailableShipments(shipmentIds);
                setSelectedShipmentId(shipmentIds[0]);
            }

            const history = await getAnalyticsHistory();
            setHistoryData(history);
        } catch (err) {
            setError('Failed to load analytics data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !latestData) {
            fetchData();
        }
    }, [isOpen]);

    const processChartData = (
        latestAnalytics: SustainabilityAnalytics | null,
        historyAnalytics: SustainabilityAnalytics[],
        shipmentId: string | null
    ): ChartData | null => {
        if (!latestAnalytics || !shipmentId) return null;
        const results = Array.isArray(latestAnalytics.results)
            ? latestAnalytics.results
            : [latestAnalytics.results];

        const shipmentData = results.find(
            (result) => result.shipment_id === shipmentId
        );

        if (!shipmentData) return null;
        const metrics = shipmentData.sustainability_analysis.metrics;

        const pieData = Object.entries(metrics)
            .filter(
                ([key, value]) =>
                    typeof value === 'number' &&
                    !['distance', 'carbon_emissions'].includes(key)
            )
            .map(([key, value]) => ({
                name: key
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                value: Number(Number(value).toFixed(2)),
            }));

        const featureImportance =
            shipmentData.sustainability_analysis.predictions.feature_importances;
        const radarData = Object.entries(featureImportance).map(([key, value]) => ({
            subject: key
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            importance: Number((value * 100).toFixed(2)),
        }));

        const sustainabilityScores = [
            {
                name: `Shipment ${shipmentId}`,
                actual: Number(
                    shipmentData.sustainability_analysis.overall_sustainability_score.toFixed(2)
                ),
                predicted: Number(
                    shipmentData.sustainability_analysis.predictions.predicted_score.toFixed(2)
                ),
            },
        ];

        const sustainabilityMetrics = results.map((result) => ({
            timestamp: new Date(result?.processed_data?.timestamp || Date.now()).toLocaleDateString(),
            carbon_footprint: result?.sustainability_analysis?.processed_data?.analytics?.sustainability_metrics?.carbon_footprint || 0,
            energy_efficiency: result?.sustainability_analysis?.processed_data?.analytics?.sustainability_metrics?.energy_efficiency || 0,
            resource_efficiency: result?.sustainability_analysis?.processed_data?.analytics?.sustainability_metrics?.resource_efficiency || 0,
            waste_reduction: result?.sustainability_analysis?.processed_data?.analytics?.sustainability_metrics?.waste_reduction || 0
        }));

        return {
            sustainabilityScores,
            sustainabilityMetrics,
            pieData,
            radarData,
        };
    };

    useEffect(() => {
        const chartData = processChartData(
            latestData,
            historyData,
            selectedShipmentId
        );
        setChartData(chartData);
    }, [latestData, historyData, selectedShipmentId]);

    const shipmentData = latestData?.results?.find(
        (result) => result.shipment_id === selectedShipmentId
    );

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    const { theme }=useTheme();

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    size="icon"
                    className={`${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}  hover:bg-black hover:text-primary rounded-none fixed right-3 top-3 z-50 transition-colors duration-300`}
                    aria-label="Open Dashboard"
                >
                    <LayoutDashboard className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" size="full" className={`p-0 border-none ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
                <SheetHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} `}>Analytics Dashboard</SheetTitle>
                        <Button
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className={`h-8 w-8 rounded-none ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'} hover:text-primary hover:bg-black transition-colors duration-300`}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] p-4">
                    <div className="space-y-4">
                        <div>
                            <label className={`block ${theme === 'dark' ? 'text-white' : 'text-black'}  mb-2`}>Choose Shipment</label>
                            <ShipmentSelector
                                shipments={availableShipments}
                                selectedId={selectedShipmentId}
                                onSelect={setSelectedShipmentId}
                            />
                        </div>
                    </div>

                    {loading && (
                        <div className={`text-center ${theme === 'dark' ? 'text-white' : 'text-black'}  p-6`}>Loading...</div>
                    )}

                    {selectedShipmentId && shipmentData && (
                        <div>
                            <ShippingKpiCards
                                shipmentId={selectedShipmentId}
                                transportMode={
                                    shipmentData.sustainability_analysis.processed_data.processed_data
                                        .transport_mode || 'N/A'
                                }
                                overallSustainabilityScore={
                                    shipmentData.sustainability_analysis.overall_sustainability_score ||
                                    0
                                }
                                materialType={
                                    String(shipmentData.sustainability_analysis.processed_data.processed_data
                                        .material_type || 'N/A')
                                }
                            />
                        </div>
                    )}

                    {!loading && !error && chartData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Metrics Overview */}
                            <ChartWrapper title="Metrics Distribution">
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            data={chartData.pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={120}
                                            fill="#8884d8"
                                            label
                                        >
                                            {chartData.pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000' }}
                                            labelStyle={{ color: '#fff' }}
                                            itemStyle={{ color: '#fff' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartWrapper>

                            {/* Feature Importance */}
                            <ChartWrapper title="Feature Importance">
                                <ResponsiveContainer width="100%" height={400}>
                                    <RadarChart data={chartData.radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" />
                                        <PolarRadiusAxis angle={60} domain={[0, 100]} />
                                        <Radar
                                            name="Importance"
                                            dataKey="importance"
                                            stroke="#8884d8"
                                            fill="#8884d8"
                                            fillOpacity={0.6}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000' }}
                                            labelStyle={{ color: '#fff' }}
                                            itemStyle={{ color: '#fff' }} />
                                        <Legend />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </ChartWrapper>

                            {/* Sustainability Scores */}
                            <ChartWrapper title="Sustainability Scores">
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={chartData.sustainabilityScores}>
                                        <XAxis dataKey="none" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000' }}
                                            labelStyle={{ color: '#fff' }}
                                            itemStyle={{ color: '#fff' }} />
                                        <Legend />
                                        <Bar
                                            dataKey="actual"
                                            fill="#8884d8"
                                            name="Actual Score"
                                        />
                                        <Bar
                                            dataKey="predicted"
                                            fill="#82ca9d"
                                            name="Predicted Score"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartWrapper>

                            {/* Sustainability Metrics */}
                            <ChartWrapper title="Sustainability Metrics">
                                    <ResponsiveContainer width="100%" height={400}>
                                        <AreaChart
                                            data={chartData.sustainabilityMetrics}
                                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                        >
                                            <XAxis dataKey="none" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#000' }}
                                                labelStyle={{ color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend />
                                            <Area
                                                type="monotone"
                                                dataKey="carbon_footprint"
                                                stackId="1"
                                                stroke="#8884d8"
                                                fill="#8884d8"
                                                name="Carbon Footprint"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="energy_efficiency"
                                                stackId="1"
                                                stroke="#82ca9d"
                                                fill="#82ca9d"
                                                name="Energy Efficiency"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="resource_efficiency"
                                                stackId="1"
                                                stroke="#ffc658"
                                                fill="#ffc658"
                                                name="Resource Efficiency"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="waste_reduction"
                                                stackId="1"
                                                stroke="#ff8042"
                                                fill="#ff8042"
                                                name="Waste Reduction"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                            </ChartWrapper>
                        </div>
                    )}

                    {!loading && !error && !chartData && (
                        <div className={`text-center ${theme === 'dark' ? 'text-white' : 'text-black'}  py-6`}>
                            No Data Available
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};

export default Dashboard;