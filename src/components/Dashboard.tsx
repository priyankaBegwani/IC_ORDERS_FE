import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  UsersIcon, 
  PaletteIcon, 
  ShoppingCartIcon, 
  BarChart3Icon, 
  TrendingUpIcon,
  PackageIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon
} from './icons/Icons';
const apiUrl = import.meta.env.VITE_API_URL;
interface Order {
  id: string;
  order_number: string;
  party_name: string;
  status: string;
  created_at: string;
  order_items: {
    design_number: string;
    color: string;
    sizes_quantities: { size: string; quantity: number }[];
  }[];
}

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const { parties, designs } = useData();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) return;
      
      try {
          const response = await fetch(`${apiUrl}/api/orders`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const ordersData = Array.isArray(data) ? data : data.orders || [];
          setOrders(ordersData);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  // Calculate order statistics
  const orderStats = useMemo(() => {
    const pendingOrders = orders.filter(order => order.status === 'pending');
    const completedOrders = orders.filter(order => order.status === 'completed');
    return {
      total: orders.length,
      pending: pendingOrders.length,
      completed: completedOrders.length
    };
  }, [orders]);

  // Calculate top selling designs
  const topSellingDesigns = useMemo(() => {
    const designCounts: Record<string, { count: number; colors: Set<string> }> = {};
    
    orders.forEach(order => {
      order.order_items.forEach(item => {
        const totalQuantity = item.sizes_quantities.reduce((sum, sq) => sum + sq.quantity, 0);
        
        if (!designCounts[item.design_number]) {
          designCounts[item.design_number] = { count: 0, colors: new Set() };
        }
        designCounts[item.design_number].count += totalQuantity;
        designCounts[item.design_number].colors.add(item.color);
      });
    });

    return Object.entries(designCounts)
      .map(([design, data]) => ({
        design_number: design,
        total_quantity: data.count,
        color_count: data.colors.size
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);
  }, [orders]);

  // Get recent pending orders
  const recentPendingOrders = useMemo(() => {
    return orders
      .filter(order => order.status === 'pending')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [orders]);

  // Get recent completed orders
  const recentCompletedOrders = useMemo(() => {
    return orders
      .filter(order => order.status === 'completed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [orders]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const stats = [
    {
      title: 'Total Orders',
      value: loading ? '...' : orderStats.total.toString(),
      change: '',
      icon: ShoppingCartIcon,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Parties',
      value: parties.length.toString(),
      change: '',
      icon: UsersIcon,
      color: 'bg-green-500'
    },
    {
      title: 'Total Designs',
      value: designs.length.toString(),
      change: '',
      icon: PaletteIcon,
      color: 'bg-purple-500'
    },
    {
      title: 'Pending Orders',
      value: loading ? '...' : orderStats.pending.toString(),
      change: '',
      icon: ClockIcon,
      color: 'bg-yellow-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">Monitor your business performance and manage operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={index} className="rounded-lg bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              {stat.change && (
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              )}
            </div>
            <h3 className="mb-1 text-2xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-sm text-gray-600">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Selling Designs */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Top Selling Designs</h3>
            <TrendingUpIcon className="h-5 w-5 text-green-600" />
          </div>
          <div className="space-y-3">
            {topSellingDesigns.length > 0 ? (
              topSellingDesigns.map((design, index) => (
                <div key={design.design_number} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center">
                    <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{design.design_number}</p>
                      <p className="text-xs text-gray-500">{design.color_count} colors</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{design.total_quantity}</p>
                    <p className="text-xs text-gray-500">units</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <PackageIcon className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500">No design data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Orders */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pending Orders</h3>
            <ClockIcon className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="space-y-3">
            {recentPendingOrders.length > 0 ? (
              recentPendingOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-600">{order.party_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                      Pending
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <ClockIcon className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500">No pending orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Completed Orders */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Completed</h3>
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          </div>
          <div className="space-y-3">
            {recentCompletedOrders.length > 0 ? (
              recentCompletedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border-l-4 border-green-400 bg-green-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-600">{order.party_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      Completed
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <CheckCircleIcon className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500">No completed orders</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <button className="rounded-lg bg-white p-6 text-left shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md">
          <UsersIcon className="mb-4 h-8 w-8 text-blue-600" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Party Entry</h3>
          <p className="text-sm text-gray-600">Add new party information</p>
        </button>

        <button className="rounded-lg bg-white p-6 text-left shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md">
          <PaletteIcon className="mb-4 h-8 w-8 text-purple-600" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Design Entry</h3>
          <p className="text-sm text-gray-600">Create and manage designs</p>
        </button>

        <button className="rounded-lg bg-white p-6 text-left shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md">
          <ShoppingCartIcon className="mb-4 h-8 w-8 text-green-600" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">New Order</h3>
          <p className="text-sm text-gray-600">Create a new order</p>
        </button>

        <button className="rounded-lg bg-white p-6 text-left shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md">
          <BarChart3Icon className="mb-4 h-8 w-8 text-orange-600" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">View Reports</h3>
          <p className="text-sm text-gray-600">Analyze performance data</p>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;