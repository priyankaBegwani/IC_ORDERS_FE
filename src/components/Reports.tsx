import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import * as XLSX from 'xlsx';
import { 
  FilterIcon, 
  SearchIcon, 
  CalendarIcon, 
  PackageIcon, 
  UsersIcon,
  BarChart3Icon,
  FileTextIcon,
  PrinterIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  ChevronDownIcon
} from './icons/Icons';


interface OrderItem {
  id: string;
  design_number: string;
  color: string;
  sizes_quantities: { size: string; quantity: number }[];
}

interface OrderRemark {
  id: string;
  remark: string;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  party_name: string;
  date_of_order: string;
  expected_delivery_date: string | null;
  transport: string;
  remarks: string;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  order_remarks?: OrderRemark[];
}

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  designs: string[];
  sizes: string[];
  parties: string[];
  status: string;
  colors: string[];
  transport: string[];
  hasRemarks: string;
  hasOrderRemarks: string;
  createdBy: string[];
}

const Reports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    designs: [],
    sizes: [],
    parties: [],
    status: '',
    colors: [],
    transport: [],
    hasRemarks: '',
    hasOrderRemarks: '',
    createdBy: []
  });

  const { token } = useAuth();
  const { parties, designs } = useData();

  // Common sizes for filter dropdown
  const commonSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
  const statusOptions = ['pending', 'processing', 'completed', 'cancelled'];

  // Helper function to calculate total quantity for an order item
  const calculateItemQuantity = (item: OrderItem): number => {
    return item.sizes_quantities?.reduce((sum, sq) => sum + sq.quantity, 0) || 0;
  };

  // Helper function to calculate total quantity for an order
  const calculateOrderQuantity = (order: Order): number => {
    return order.order_items?.reduce((sum, item) => sum + calculateItemQuantity(item), 0) || 0;
  };

  // Helper function to get design totals for an order
  const getOrderDesignTotals = (order: Order): Record<string, number> => {
    const designTotals: Record<string, number> = {};
    order.order_items?.forEach(item => {
      const quantity = calculateItemQuantity(item);
      if (designTotals[item.design_number]) {
        designTotals[item.design_number] += quantity;
      } else {
        designTotals[item.design_number] = quantity;
      }
    });
    return designTotals;
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      const ordersData = Array.isArray(data) ? data : data.orders || [];
      setOrders(ordersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Date range filter
      if (filters.dateFrom && order.date_of_order < filters.dateFrom) return false;
      if (filters.dateTo && order.date_of_order > filters.dateTo) return false;
      
      // Party filter
      if (filters.parties.length > 0) {
        const hasMatchingParty = filters.parties.some(party => 
          order.party_name.toLowerCase().includes(party.toLowerCase())
        );
        if (!hasMatchingParty) return false;
      }
      
      // Status filter
      if (filters.status && order.status !== filters.status) return false;
      
      // Design filter
      if (filters.designs.length > 0) {
        const hasMatchingDesign = order.order_items.some(item =>
          filters.designs.some(design =>
            item.design_number.toLowerCase().includes(design.toLowerCase())
          )
        );
        if (!hasMatchingDesign) return false;
      }
      
      // Size filter
      if (filters.sizes.length > 0) {
        const hasMatchingSize = order.order_items.some(item =>
          item.sizes_quantities.some(sq => 
            filters.sizes.includes(sq.size)
          )
        );
        if (!hasMatchingSize) return false;
      }
      
      // Color filter
      if (filters.colors.length > 0) {
        const hasMatchingColor = order.order_items.some(item =>
          filters.colors.some(color =>
            item.color.toLowerCase().includes(color.toLowerCase())
          )
        );
        if (!hasMatchingColor) return false;
      }
      
      // Transport filter
      if (filters.transport.length > 0) {
        const hasMatchingTransport = filters.transport.some(transport =>
          order.transport.toLowerCase().includes(transport.toLowerCase())
        );
        if (!hasMatchingTransport) return false;
      }
      
      // Has remarks filter
      if (filters.hasRemarks === 'yes' && !order.remarks) return false;
      if (filters.hasRemarks === 'no' && order.remarks) return false;
      
      // Has order remarks filter
      if (filters.hasOrderRemarks === 'yes' && (!order.order_remarks || order.order_remarks.length === 0)) return false;
      if (filters.hasOrderRemarks === 'no' && order.order_remarks && order.order_remarks.length > 0) return false;
      
      return true;
    });
  }, [orders, filters]);

  // Generate report data for export
  const generateReportData = () => {
    const reportData: any[] = [];
    
    filteredOrders.forEach(order => {
      // If order has items, create rows for each item and size
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          if (item.sizes_quantities && item.sizes_quantities.length > 0) {
            item.sizes_quantities.forEach(sq => {
              reportData.push({
                'Order Number': order.order_number,
                'Party Name': order.party_name,
                'Order Date': new Date(order.date_of_order).toLocaleDateString('en-IN'),
                'Expected Delivery': order.expected_delivery_date ? 
                  new Date(order.expected_delivery_date).toLocaleDateString('en-IN') : '',
                'Design Number': item.design_number,
                'Color': item.color,
                'Size': sq.size,
                'Quantity': sq.quantity,
                'Status': order.status,
                'Transport': order.transport,
                'Order Remarks (General)': order.remarks || '',
                'Order Remarks (Specific)': order.order_remarks?.map(r => r.remark).join(' | ') || '',
                'Created Date': new Date(order.created_at).toLocaleDateString('en-IN'),
                'Updated Date': new Date(order.updated_at).toLocaleDateString('en-IN')
              });
            });
          } else {
            // Item without sizes
            reportData.push({
              'Order Number': order.order_number,
              'Party Name': order.party_name,
              'Order Date': new Date(order.date_of_order).toLocaleDateString('en-IN'),
              'Expected Delivery': order.expected_delivery_date ? 
                new Date(order.expected_delivery_date).toLocaleDateString('en-IN') : '',
              'Design Number': item.design_number,
              'Color': item.color,
              'Size': '',
              'Quantity': '',
              'Status': order.status,
              'Transport': order.transport,
              'Order Remarks (General)': order.remarks || '',
              'Order Remarks (Specific)': order.order_remarks?.map(r => r.remark).join(' | ') || '',
              'Created Date': new Date(order.created_at).toLocaleDateString('en-IN'),
              'Updated Date': new Date(order.updated_at).toLocaleDateString('en-IN')
            });
          }
        });
      } else {
        // Order without items (remarks only)
        reportData.push({
          'Order Number': order.order_number,
          'Party Name': order.party_name,
          'Order Date': new Date(order.date_of_order).toLocaleDateString('en-IN'),
          'Expected Delivery': order.expected_delivery_date ? 
            new Date(order.expected_delivery_date).toLocaleDateString('en-IN') : '',
          'Design Number': '',
          'Color': '',
          'Size': '',
          'Quantity': '',
          'Status': order.status,
          'Transport': order.transport,
          'Order Remarks (General)': order.remarks || '',
          'Order Remarks (Specific)': order.order_remarks?.map(r => r.remark).join(' | ') || '',
          'Created Date': new Date(order.created_at).toLocaleDateString('en-IN'),
          'Updated Date': new Date(order.updated_at).toLocaleDateString('en-IN')
        });
      }
    });
    
    return reportData;
  };

  // Export to Excel
  const exportToExcel = () => {
    const reportData = generateReportData();
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders Report');
    
    // Set column widths
    ws['!cols'] = [
      { width: 15 }, // Order Number
      { width: 25 }, // Party Name
      { width: 12 }, // Order Date
      { width: 15 }, // Expected Delivery
      { width: 15 }, // Design Number
      { width: 15 }, // Color
      { width: 8 },  // Size
      { width: 10 }, // Quantity
      { width: 12 }, // Status
      { width: 20 }, // Transport
      { width: 30 }, // Order Remarks (General)
      { width: 40 }, // Order Remarks (Specific)
      { width: 12 }, // Created Date
      { width: 12 }  // Updated Date
    ];
    
    const fileName = `orders_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export to CSV
  const exportToCSV = () => {
    const reportData = generateReportData();
    const ws = XLSX.utils.json_to_sheet(reportData);
    const csvData = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (using browser's print functionality)
  const showPrintPreviewModal = () => {
    setShowPrintPreview(true);
  };

  // Print report
  const printReport = () => {
    window.print();
  };

  const closePrintPreview = () => {
    setShowPrintPreview(false);
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      designs: [],
      sizes: [],
      parties: [],
      status: '',
      colors: [],
      transport: [],
      hasRemarks: '',
      hasOrderRemarks: '',
      createdBy: []
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper functions for multi-select
  const toggleDesignFilter = (design: string) => {
    setFilters(prev => ({
      ...prev,
      designs: prev.designs.includes(design)
        ? prev.designs.filter(d => d !== design)
        : [...prev.designs, design]
    }));
  };

  const toggleSizeFilter = (size: string) => {
    setFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const togglePartyFilter = (party: string) => {
    setFilters(prev => ({
      ...prev,
      parties: prev.parties.includes(party)
        ? prev.parties.filter(p => p !== party)
        : [...prev.parties, party]
    }));
  };

  const toggleColorFilter = (color: string) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const toggleTransportFilter = (transport: string) => {
    setFilters(prev => ({
      ...prev,
      transport: prev.transport.includes(transport)
        ? prev.transport.filter(t => t !== transport)
        : [...prev.transport, transport]
    }));
  };

  // Get unique values for multi-select options
  const uniqueDesigns = [...new Set(orders.flatMap(order => 
    order.order_items.map(item => item.design_number)
  ))].sort();

  const uniqueParties = [...new Set(orders.map(order => order.party_name))].sort();

  const uniqueColors = [...new Set(orders.flatMap(order => 
    order.order_items.map(item => item.color)
  ))].filter(Boolean).sort();

  const uniqueTransports = [...new Set(orders.map(order => order.transport))].filter(Boolean).sort();

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalQuantity = filteredOrders.reduce((sum, order) => {
      return sum + calculateOrderQuantity(order);
    }, 0);

    const statusCounts = filteredOrders.reduce((counts, order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Calculate design-wise totals across all orders
    const designTotals = filteredOrders.reduce((totals, order) => {
      const orderDesignTotals = getOrderDesignTotals(order);
      Object.entries(orderDesignTotals).forEach(([design, quantity]) => {
        totals[design] = (totals[design] || 0) + quantity;
      });
      return totals;
    }, {} as Record<string, number>);
    return {
      totalOrders: filteredOrders.length,
      totalQuantity,
      statusCounts,
      designTotals
    };
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-gray-600">Generate and export detailed order reports</p>
        </div>
        <div className="mt-4 flex space-x-2 sm:mt-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center"
          >
            <FilterIcon className="mr-2 h-5 w-5" />
            Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => setError('')}
            className="text-red-800 hover:text-red-900 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Status</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Has General Remarks
              </label>
              <select
                value={filters.hasRemarks}
                onChange={(e) => setFilters({ ...filters, hasRemarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Orders</option>
                <option value="yes">With Remarks</option>
                <option value="no">Without Remarks</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Designs ({filters.designs.length} selected)
              </label>
              <div className="relative">
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-white">
                  {uniqueDesigns.map(design => (
                    <label key={design} className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={filters.designs.includes(design)}
                        onChange={() => toggleDesignFilter(design)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{design}</span>
                    </label>
                  ))}
                  {uniqueDesigns.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No designs available</div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Colors ({filters.colors.length} selected)
              </label>
              <div className="relative">
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-white">
                  {uniqueColors.map(color => (
                    <label key={color} className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={filters.colors.includes(color)}
                        onChange={() => toggleColorFilter(color)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{color}</span>
                    </label>
                  ))}
                  {uniqueColors.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No colors available</div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sizes ({filters.sizes.length} selected)
              </label>
              <div className="relative">
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-white">
                  {commonSizes.map(size => (
                    <label key={size} className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={filters.sizes.includes(size)}
                        onChange={() => toggleSizeFilter(size)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{size}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Parties ({filters.parties.length} selected)
              </label>
              <div className="relative">
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-white">
                  {uniqueParties.map(party => (
                    <label key={party} className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={filters.parties.includes(party)}
                        onChange={() => togglePartyFilter(party)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{party}</span>
                    </label>
                  ))}
                  {uniqueParties.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No parties available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Transport ({filters.transport.length} selected)
              </label>
              <div className="relative">
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-white">
                  {uniqueTransports.map(transport => (
                    <label key={transport} className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={filters.transport.includes(transport)}
                        onChange={() => toggleTransportFilter(transport)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{transport}</span>
                    </label>
                  ))}
                  {uniqueTransports.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No transport options available</div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Has Order Remarks
              </label>
              <select
                value={filters.hasOrderRemarks}
                onChange={(e) => setFilters({ ...filters, hasOrderRemarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Orders</option>
                <option value="yes">With Order Remarks</option>
                <option value="no">Without Order Remarks</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
            <div className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
          </div>
        </div>
      )}

     
      {/* Export Actions */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>
            <p className="text-sm text-gray-600">Download your filtered report data</p>
          </div>
          <div className="mt-4 flex space-x-2 sm:mt-0">
            <button
              onClick={exportToExcel}
              className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-green-700"
            >
              <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
              Excel
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              CSV
            </button>
            <button
              onClick={showPrintPreviewModal}
              className="flex items-center rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-gray-700"
            >
              <PrinterIcon className="mr-2 h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Party Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Design Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Transport
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Remarks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="transition-colors duration-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <PackageIcon className="mr-2 h-4 w-4 text-gray-400" />
                      <div>
                        <div className="rounded bg-gray-100 px-2 py-1 font-mono text-sm font-medium text-gray-900">
                          {order.order_number}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Created: {formatDate(order.created_at)}
                        </div>
                        {order.updated_at !== order.created_at && (
                          <div className="text-xs text-gray-500">
                            Updated: {formatDate(order.updated_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.party_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    {order.order_items && order.order_items.length > 0 ? (
                      <div className="max-w-xs">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">
                            {order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => toggleOrderExpansion(order.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
                          >
                            {expandedOrders.has(order.id) ? 'Collapse' : 'Expand'}
                            <ChevronDownIcon 
                              className={`w-3 h-3 ml-1 transition-transform ${
                                expandedOrders.has(order.id) ? 'rotate-180' : ''
                              }`} 
                            />
                          </button>
                        </div>
                        
                        {expandedOrders.has(order.id) ? (
                          // Expanded view - show all items
                          <div className="space-y-1">
                            {order.order_items.map((item, index) => (
                              <div key={index} className="rounded border bg-gray-50 p-2 text-xs">
                                <div className="mb-1 flex items-center space-x-2">
                                  <span className="rounded border bg-white px-2 py-0.5 text-xs font-medium text-gray-900">
                                    {item.design_number}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {item.color}
                                  </span>
                                  <span className="rounded border bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
                                    Total: {calculateItemQuantity(item)}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {item.sizes_quantities?.map((sq, sqIndex) => (
                                    <span key={sqIndex} className="inline-block rounded border bg-blue-50 px-1 py-0.5 text-xs text-blue-700">
                                      {sq.size}:{sq.quantity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {/* Order Total */}
                            <div className="mt-2 rounded border border-green-300 bg-green-100 p-2 text-xs">
                              <div className="font-semibold text-green-800">
                                Order Total: {calculateOrderQuantity(order)} kurtas
                              </div>
                              {/* Design-wise totals for this order */}
                              <div className="mt-1 space-y-1">
                                {Object.entries(getOrderDesignTotals(order)).map(([design, quantity]) => (
                                  <div key={design} className="text-green-700">
                                    {design}: {quantity} kurtas
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Collapsed view - show summary
                          <div className="text-xs text-gray-600">
                            <div className="mb-1 flex flex-wrap gap-1">
                              {order.order_items.slice(0, 3).map((item, index) => (
                                <span key={index} className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs">
                                  {item.design_number}
                                </span>
                              ))}
                              {order.order_items.length > 3 && (
                                <span className="px-1 text-xs text-gray-500">
                                  +{order.order_items.length - 3} more
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-semibold text-green-600">
                              Total: {calculateOrderQuantity(order)} kurtas
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs italic text-gray-500">
                        No design items
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="mb-1 flex items-center text-gray-900">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {formatDate(order.date_of_order)}
                      </div>
                      {order.expected_delivery_date && (
                        <div className="text-xs text-gray-600">
                          Expected: {formatDate(order.expected_delivery_date)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {order.transport || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs space-y-1">
                      {order.remarks && (
                        <div className="text-xs">
                          <span className="mr-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            General
                          </span>
                          <span className="text-gray-700">
                            {order.remarks.length > 40 ? `${order.remarks.substring(0, 40)}...` : order.remarks}
                          </span>
                        </div>
                      )}
                      {order.order_remarks && order.order_remarks.length > 0 && (
                        <div className="text-xs">
                          <span className="mr-1 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                            Order
                          </span>
                          <div className="inline">
                            {order.order_remarks.slice(0, 1).map((remark, index) => (
                              <span key={remark.id} className="text-gray-700">
                                {remark.remark.length > 35 ? `${remark.remark.substring(0, 35)}...` : remark.remark}
                              </span>
                            ))}
                            {order.order_remarks.length > 1 && (
                              <span className="ml-1 text-gray-500">
                                (+{order.order_remarks.length - 1} more)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {!order.remarks && (!order.order_remarks || order.order_remarks.length === 0) && (
                        <div className="text-xs italic text-gray-500">No remarks</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="py-12 text-center">
              <BarChart3Icon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No orders found matching the selected filters</p>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3Icon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No orders found matching the selected filters</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="rounded-lg border bg-gray-50 p-4">
                  {/* Order Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <PackageIcon className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="rounded bg-white px-2 py-1 font-mono text-sm font-medium text-gray-900">
                        {order.order_number}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Party Name */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-900">{order.party_name}</p>
                  </div>

                  {/* Design Items */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-medium text-gray-700">Design Items:</p>
                      <div className="space-y-2">
                        {order.order_items.map((item, index) => (
                          <div key={index} className="rounded border bg-white p-2 text-xs">
                            <div className="mb-1 font-medium text-gray-900">{item.design_number}</div>
                            <div className="mb-1 text-gray-600">Color: {item.color}</div>
                            <div className="text-gray-600">
                              {item.sizes_quantities?.map((sq, sqIndex) => (
                                <span key={sqIndex} className="mr-2 inline-block rounded bg-gray-100 px-1 py-0.5 text-xs">
                                  {sq.size}: {sq.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="mb-3">
                    <div className="mb-1 flex items-center text-sm text-gray-900">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      <span className="mr-2 text-xs text-gray-600">Order:</span>
                      {formatDate(order.date_of_order)}
                    </div>
                    {order.expected_delivery_date && (
                      <div className="ml-4 text-xs text-gray-600">
                        Expected: {formatDate(order.expected_delivery_date)}
                      </div>
                    )}
                  </div>

                  {/* Transport */}
                  {order.transport && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Transport:</span> {order.transport}
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  {(order.remarks || (order.order_remarks && order.order_remarks.length > 0)) && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-medium text-gray-700">Remarks:</p>
                      {order.remarks && (
                        <div className="mb-2 rounded border bg-blue-50 p-2 text-xs">
                          <div className="mb-1 font-medium text-blue-800">General:</div>
                          <div className="text-blue-700">{order.remarks}</div>
                        </div>
                      )}
                      {order.order_remarks && order.order_remarks.length > 0 && (
                        <div className="rounded border bg-yellow-50 p-2 text-xs">
                          <div className="mb-1 font-medium text-yellow-800">Order Remarks:</div>
                          {order.order_remarks.map((remark, index) => (
                            <div key={remark.id} className="mb-1 text-yellow-700">
                              • {remark.remark}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="border-t pt-2 text-xs text-gray-500">
                    <div>Created: {formatDate(order.created_at)}</div>
                    {order.updated_at !== order.created_at && (
                      <div>Updated: {formatDate(order.updated_at)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-xl font-bold text-gray-900">Print Preview - Orders Report</h2>
              <div className="flex space-x-3">
                <button
                  onClick={printReport}
                  className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
                >
                  <PrinterIcon className="mr-2 h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={closePrintPreview}
                  className="p-2 text-gray-600 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Print Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-100 p-6">
              <div className="mx-auto bg-white shadow-lg" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
                {/* Report Header */}
                <div className="mb-8 text-center">
                  <h1 className="mb-4 text-3xl font-bold text-gray-900">Orders Report</h1>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Generated on:</strong> {new Date().toLocaleDateString('en-IN')}</p>
                    <p><strong>Total Orders:</strong> {filteredOrders.length}</p>
                    <p><strong>Total Items:</strong> {generateReportData().length}</p>
                    {(filters.dateFrom || filters.dateTo) && (
                      <p><strong>Date Range:</strong> {filters.dateFrom || 'Start'} to {filters.dateTo || 'End'}</p>
                    )}
                  </div>
                </div>

                {/* Summary Statistics */}
                <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{summaryStats.totalOrders}</div>
                    <div className="text-sm text-blue-800">Total Orders</div>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{summaryStats.totalQuantity}</div>
                    <div className="text-sm text-green-800">Total Kurtas</div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{summaryStats.statusCounts.pending || 0}</div>
                    <div className="text-sm text-yellow-800">Pending</div>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{summaryStats.statusCounts.completed || 0}</div>
                    <div className="text-sm text-purple-800">Completed</div>
                  </div>
                </div>

                {/* Design-wise Summary */}
                {Object.keys(summaryStats.designTotals).length > 0 && (
                  <div className="mb-8">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">Design-wise Kurta Totals</h3>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                      {Object.entries(summaryStats.designTotals)
                        .sort(([,a], [,b]) => b - a)
                        .map(([design, quantity]) => (
                        <div key={design} className="rounded-lg border bg-indigo-50 p-3 text-center">
                          <div className="text-lg font-bold text-indigo-600">{quantity}</div>
                          <div className="text-xs font-medium text-indigo-800">{design}</div>
                        </div>
                      ))}
                      {/* Order Total for Mobile */}
                      <div className="mt-2 rounded border border-green-300 bg-green-100 p-2 text-xs">
                        <div className="font-semibold text-green-800">
                          Order Total: {calculateOrderQuantity(order)} kurtas
                        </div>
                        <div className="mt-1 space-y-1">
                          {Object.entries(getOrderDesignTotals(order)).map(([design, quantity]) => (
                            <div key={design} className="text-green-700">
                              {design}: {quantity} kurtas
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Orders Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Order #</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Party</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Date</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Design Items</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Quantities</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Status</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Transport</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, index) => (
                        <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-2 py-2 font-mono text-xs">{order.order_number}</td>
                          <td className="border border-gray-300 px-2 py-2">{order.party_name}</td>
                          <td className="border border-gray-300 px-2 py-2">{formatDate(order.date_of_order)}</td>
                          <td className="border border-gray-300 px-2 py-2">
                            {order.order_items && order.order_items.length > 0 ? (
                              <div className="space-y-1">
                                {order.order_items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="text-xs">
                                    <div className="font-medium">{item.design_number} - {item.color}</div>
                                    <div className="text-gray-600">
                                      {item.sizes_quantities?.map((sq, sqIndex) => (
                                        <span key={sqIndex} className="mr-2">
                                          {sq.size}:{sq.quantity}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="italic text-gray-500">No items</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            {order.order_items && order.order_items.length > 0 ? (
                              <div className="space-y-1">
                                {/* Design-wise totals */}
                                {Object.entries(getOrderDesignTotals(order)).map(([design, quantity]) => (
                                  <div key={design} className="text-xs">
                                    <span className="font-medium text-indigo-600">{design}:</span>
                                    <span className="ml-1 text-indigo-800">{quantity}</span>
                                  </div>
                                ))}
                                {/* Order total */}
                                <div className="mt-1 border-t pt-1 text-xs font-semibold text-green-600">
                                  Total: {calculateOrderQuantity(order)} kurtas
                                </div>
                              </div>
                            ) : (
                              <span className="italic text-gray-500">0</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-2 py-2">{order.transport || '-'}</td>
                          <td className="border border-gray-300 px-2 py-2">
                            <div className="space-y-1">
                              {order.remarks && (
                                <div className="text-xs">
                                  <span className="font-medium text-blue-800">General:</span> {order.remarks}
                                </div>
                              )}
                              {order.order_remarks && order.order_remarks.length > 0 && (
                                <div className="text-xs">
                                  <span className="font-medium text-yellow-800">Order:</span>
                                  {order.order_remarks.map((remark, index) => (
                                    <div key={remark.id} className="ml-2">• {remark.remark}</div>
                                  ))}
                                </div>
                              )}
                              {!order.remarks && (!order.order_remarks || order.order_remarks.length === 0) && (
                                <span className="italic text-gray-500">No remarks</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;