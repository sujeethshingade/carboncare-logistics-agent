import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, RadarChart, Radar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Cell } from 'recharts';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import { getLatestAnalytics } from '@/lib/analytics-service';

interface Metrics {
    package_sustainability_index: number;
    route_efficiency_score: number;
    carbon_emission_index: number;
    resource_utilization_rate: number;
    energy_efficiency_rating: number;
    waste_reduction_score: number;
    [key: string]: number;
}

interface Prediction {
    predicted_score: number;
    feature_importances: {
        [key: string]: number;
    };
}

interface DetailedResult {
    metrics: Metrics;
    overall_sustainability_score: number;
    predictions: Prediction;
}

interface SustainabilityAnalytics {
    timestamp: string;
    num_shipments_analyzed: number;
    summary_statistics: any;
    detailed_results: DetailedResult[];
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
}

export const Dashboard: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<SustainabilityAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLatestData = async () => {
        setLoading(true);
        setError(null);
        try {
            const latestData = await getLatestAnalytics();
            setData(latestData);
        } catch (err) {
            setError('Failed to load analytics data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !data) {
            fetchLatestData();
        }
    }, [isOpen]);

    const processChartData = (analyticsData: SustainabilityAnalytics | null): ChartData | null => {
        if (!analyticsData?.detailed_results?.length) return null;

        const avgMetrics = analyticsData.detailed_results.reduce<Record<string, number>>((acc, curr) => {
            Object.entries(curr.metrics).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    acc[key] = (acc[key] || 0) + value / analyticsData.detailed_results.length;
                }
            });
            return acc;
        }, {});

        const pieData = Object.entries(avgMetrics).map(([key, value]) => ({
            name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            value: Number(value.toFixed(2))
        }));

        const featureImportance = analyticsData.detailed_results[0]?.predictions?.feature_importances || {};
        const radarData = Object.entries(featureImportance).map(([key, value]) => ({
            subject: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            importance: Number((value * 100).toFixed(2))
        }));

        const metricsData = analyticsData.detailed_results.map((result, index) => ({
            name: `Shipment ${index + 1}`,
            ...result.metrics
        }));

        const sustainabilityScores = analyticsData.detailed_results.map((result, index) => ({
            name: `Shipment ${index + 1}`,
            actual: Number(result.overall_sustainability_score.toFixed(2)),
            predicted: Number(result.predictions.predicted_score.toFixed(2))
        }));

        return {
            metricsData: metricsData as Array<{ name: string } & Metrics>,
            sustainabilityScores,
            pieData,
            radarData
        };
    };

    const chartData = processChartData(data);
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    size="icon"
                    className="bg-black text-white hover:bg-black hover:text-primary rounded-none fixed right-3 top-3 z-50 transition-colors duration-300"
                    aria-label="Open analytics dashboard"
                >
                    <LayoutDashboard className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="w-full p-0 bg-black border-l"
            >
                <SheetHeader className="p-4 border-b flex flex-row justify-between items-center space-x-2">
                    <div className="flex items-center space-x-2">
                        <SheetTitle className="text-lg font-semibold text-white">Analytics Dashboard</SheetTitle>
                        <Button
                            size="icon"
                            onClick={fetchLatestData}
                            disabled={loading}
                            className="h-8 w-8 bg-black text-white hover:bg-black hover:text-primary focus:text-primary rounded-none"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-80px)] p-4">
                    {loading && <div className="text-center text-white">Loading...</div>}

                    {!loading && !error && chartData && (
                        <div className="space-y-8">
                            {/* Area Chart */}
                            <div className="p-4 border">
                                <h3 className="text-white mb-4">Sustainability Metrics Trends</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <AreaChart data={chartData.metricsData}>
                                        <defs>
                                            <linearGradient id="colorPsi" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorCei" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#ffc658" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                        <XAxis dataKey="name" stroke="#fff" />
                                        <YAxis stroke="#fff" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#000',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px'
                                            }}
                                        />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="package_sustainability_index"
                                            stroke="#8884d8"
                                            fillOpacity={1}
                                            fill="url(#colorPsi)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="route_efficiency_score"
                                            stroke="#82ca9d"
                                            fillOpacity={1}
                                            fill="url(#colorRes)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="carbon_emission_index"
                                            stroke="#ffc658"
                                            fillOpacity={1}
                                            fill="url(#colorCei)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Bar Chart */}
                            <div className="p-4 border">
                                <h3 className="text-white mb-4">Actual vs Predicted Scores</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={chartData.sustainabilityScores}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                        <XAxis dataKey="name" stroke="#fff" />
                                        <YAxis stroke="#fff" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#000',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px'
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="actual" fill="#8884d8" />
                                        <Bar dataKey="predicted" fill="#82ca9d" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Pie Chart */}
                            <div className="p-4 border">
                                <h3 className="text-white mb-4">Average Metrics Distribution</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            data={chartData.pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            fill="#8884d8"
                                            label
                                        >
                                            {chartData.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Radar Chart */}
                            <div className="p-4 border">
                                <h3 className="text-white mb-4">Feature Importance Analysis</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartData.radarData}>
                                        <PolarGrid stroke="#ffffff20" />
                                        <PolarAngleAxis dataKey="subject" stroke="#fff" />
                                        <PolarRadiusAxis stroke="#fff" />
                                        <Radar
                                            name="Feature Importance (%)"
                                            dataKey="importance"
                                            stroke="#8884d8"
                                            fill="#8884d8"
                                            fillOpacity={0.6}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#000',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px'
                                            }}
                                        />
                                        <Legend />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Line Chart */}
                            <div className="p-4 border">
                                <h3 className="text-white mb-4">Resource Utilization Trends</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={chartData.metricsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                        <XAxis dataKey="name" stroke="#fff" />
                                        <YAxis stroke="#fff" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#000',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px'
                                            }}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="resource_utilization_rate"
                                            stroke="#8884d8"
                                            dot={{ stroke: '#8884d8', strokeWidth: 2 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="energy_efficiency_rating"
                                            stroke="#82ca9d"
                                            dot={{ stroke: '#82ca9d', strokeWidth: 2 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="waste_reduction_score"
                                            stroke="#ffc658"
                                            dot={{ stroke: '#ffc658', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};

export default Dashboard;