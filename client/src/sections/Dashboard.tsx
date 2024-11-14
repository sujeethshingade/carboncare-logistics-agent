import React, { useState, useEffect } from 'react';
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
    CartesianGrid,
    Legend,
    LineChart,
    Line,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart2, X } from 'lucide-react';

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
        processed_data: ProcessedData;
    };
}

interface Result {
    shipment_id: string;
    sustainability_analysis: SustainabilityAnalysis;
}

interface SustainabilityAnalytics {
    timestamp: string;
    num_shipments_analyzed: number;
    results: Result[];
}

interface ChartData {
    metricsData: Array<{ name: string } & Metrics>;
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
    historyData: Array<{
        timestamp: string;
        score: number | null;
    }>;
}

const ShipmentSelector: React.FC<{
    shipments: string[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}> = ({ shipments, selectedId, onSelect }) => {
    return (
        <select
            value={selectedId || ''}
            onChange={(e) => onSelect(e.target.value)}
            className="p-2 border bg-black text-white w-full cursor-pointer focus:border-primary [&>option]:bg-black"
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
}) => (
    <div className="bg-black p-4 border mt-6 mb-6">
        <h4 className="text-white mb-4 text-lg font-medium">{title}</h4>
        <div className="flex justify-center items-center">{children}</div>
    </div>
);

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

        const historyChartData = historyAnalytics
            .map((entry) => {
                const entryResults = Array.isArray(entry.results)
                    ? entry.results
                    : [entry.results];

                const result = entryResults.find(
                    (r) => r.shipment_id === shipmentId
                );

                return {
                    timestamp: new Date(entry.timestamp).toLocaleDateString(),
                    score: result?.sustainability_analysis.overall_sustainability_score || null,
                };
            })
            .filter((data) => data.score !== null);

        return {
            metricsData: [{ name: shipmentId, ...metrics }],
            sustainabilityScores,
            pieData,
            radarData,
            historyData: historyChartData,
        };
    };

    const chartData = processChartData(
        latestData,
        historyData,
        selectedShipmentId
    );

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    size="icon"
                    className="bg-black text-white hover:bg-black hover:text-primary rounded-none fixed right-3 top-3 z-50 transition-colors duration-300"
                    aria-label="Open Dashboard"
                >
                    <BarChart2 className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" size="full" className="p-0 border-none bg-black">
                <SheetHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-lg font-semibold text-white">Analytics Dashboard</SheetTitle>
                        <Button
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 rounded-none bg-black text-white hover:text-primary hover:bg-black transition-colors duration-300 mr-1"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] p-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-white mb-2">Choose Shipment</label>
                            <ShipmentSelector
                                shipments={availableShipments}
                                selectedId={selectedShipmentId}
                                onSelect={setSelectedShipmentId}
                            />
                        </div>

                        {selectedShipmentId && latestData?.results && (
                            <div className="bg-black p-4 border mb-8">
                                <h4 className="text-white font-medium mb-2">
                                    Shipment Details
                                </h4>
                                {latestData.results
                                    .find((r) => r.shipment_id === selectedShipmentId)
                                    ?.sustainability_analysis.processed_data.processed_data && (
                                        <div className="text-white space-y-2">
                                            <p>
                                                <strong>Transport Mode:</strong>{' '}
                                                {
                                                    latestData.results
                                                        .find((r) => r.shipment_id === selectedShipmentId)
                                                        ?.sustainability_analysis.processed_data.processed_data
                                                        .transport_mode
                                                }
                                            </p>
                                            <p>
                                                <strong>Distance:</strong>{' '}
                                                {Number(
                                                    latestData.results
                                                        .find((r) => r.shipment_id === selectedShipmentId)
                                                        ?.sustainability_analysis.metrics.distance || 0
                                                ).toFixed(2)}{' '}
                                                km
                                            </p>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>

                    {loading && (
                        <div className="text-center text-white p-6">Loading...</div>
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
                                            outerRadius={150}
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
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
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
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData.sustainabilityScores}>
                                        <XAxis dataKey="name" />
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

                            {/* Historical Trends */}
                            <ChartWrapper title="Historical Sustainability Scores">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={chartData.historyData}>
                                        <XAxis dataKey="timestamp" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000' }}
                                            labelStyle={{ color: '#fff' }}
                                            itemStyle={{ color: '#fff' }} />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#8884d8"
                                            name="Sustainability Score"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartWrapper>
                        </div>
                    )}

                    {!loading && !error && !chartData && (
                        <div className="text-center text-white py-6">
                            No Data Available
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};

export default Dashboard;