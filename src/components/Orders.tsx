import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  PlusIcon, 
  SearchIcon, 
  FilterIcon, 
  Edit2Icon, 
  Trash2Icon, 
  PackageIcon, 
  CalendarIcon, 
  TruckIcon, 
  FileTextIcon, 
  ChevronDownIcon,
  CheckCircleIcon
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
  created_at: string;
  order_items: OrderItem[];
  order_remarks?: OrderRemark[];
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    party_name: '',
    date_of_order: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    transport: '',
    remarks: '',
    status: 'pending',
    order_items: [
      { design_number: '', color: '', sizes_quantities: [] as { size: string; quantity: number }[] }
    ],
    order_remarks: [''] as string[]
  });

  const { token } = useAuth();
  const { parties, designs, transportOptions, partiesError, designsError, transportError, refreshParties, refreshDesigns, refreshTransport } = useData();

  // Standard apparel sizes
  const commonSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      setOrders([]);
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      await fetchOrders();
      setLoading(false);
    };
    loadOrders();
  }, []);

  // Set errors from data context
  useEffect(() => {
    if (partiesError) setError(partiesError);
    if (designsError) setError(designsError);
    if (transportError) setError(transportError);
  }, [partiesError, designsError, transportError]);
  
  const getAvailableColors = (designNumber: string) => {
    const design = designs.find(d => d.design_number === designNumber);
    return design ? design.colors : [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Either design items OR order remarks must be provided
    const hasValidDesignItems = formData.order_items.some(item => 
      item.design_number && 
      item.color && 
      item.sizes_quantities && 
      item.sizes_quantities.length > 0 &&
      item.sizes_quantities.some(sq => sq.quantity > 0)
    );
    
    const hasValidOrderRemarks = formData.order_remarks.some(remark => 
      remark && remark.trim().length > 0
    );
    
    if (!hasValidDesignItems && !hasValidOrderRemarks) {
      setError('Please add either design items or order remarks (or both)');
      return;
    }
    
    setLoading(true);

    try {
      const url = editingOrder 
        ? `http://localhost:3001/api/orders/${editingOrder.id}`
        : 'http://localhost:3001/api/orders';
      
      const method = editingOrder ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingOrder ? 'update' : 'create'} order`);
      }

      resetForm();
      fetchOrders();
      
      // Refresh parties if a new custom party was added
      if (!editingOrder && !parties.find(p => p.name === formData.party_name)) {
        refreshParties();
      }
      refreshTransport(); // Refresh transport options
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingOrder ? 'update' : 'create'} order`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      party_name: order.party_name,
      date_of_order: order.date_of_order,
      expected_delivery_date: order.expected_delivery_date || '',
      transport: order.transport,
      remarks: order.remarks,
      status: order.status,
      order_items: order.order_items.length > 0 ? order.order_items.map(item => ({
        design_number: item.design_number,
        color: item.color,
        sizes_quantities: item.sizes_quantities
      })) : [
        { design_number: '', color: '', sizes_quantities: [] }
      ],
      order_remarks: order.order_remarks?.map(r => r.remark) || []
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete order "${orderNumber}"?`)) return;

    try {
      const response = await fetch(`http://localhost:3001/api/orders/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      fetchOrders();
      refreshParties(); // Refresh in case party was updated
      refreshTransport(); // Refresh transport options
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  const handleCompleteOrder = async (order: Order) => {
    if (!confirm(`Mark order "${order.order_number}" as completed?`)) return;

    try {
      const response = await fetch(`http://localhost:3001/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          party_name: order.party_name,
          date_of_order: order.date_of_order,
          expected_delivery_date: order.expected_delivery_date,
          transport: order.transport,
          remarks: order.remarks,
          status: 'completed',
          order_items: order.order_items,
          order_remarks: order.order_remarks?.map(r => r.remark) || []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete order');
      }

      fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete order');
    }
  };
  const resetForm = () => {
    setFormData({
      party_name: '',
      date_of_order: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      transport: '',
      remarks: '',
      status: 'pending',
      order_items: [
        { design_number: '', color: '', sizes_quantities: [] }
      ],
      order_remarks: ['']
    });
    setShowCreateForm(false);
    setEditingOrder(null);
    setError('');
  };

  const addOrderItem = () => {
    setFormData(prev => ({
      ...prev,
      order_items: [...prev.order_items, { design_number: '', color: '', sizes_quantities: [] }]
    }));
  };

  const removeOrderItem = (index: number) => {
    if (formData.order_items.length > 1) {
      setFormData(prev => ({
        ...prev,
        order_items: prev.order_items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOrderItem = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      order_items: prev.order_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateOrderItemSizeQuantity = (itemIndex: number, size: string, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      order_items: prev.order_items.map((item, i) => {
        if (i !== itemIndex) return item;
        
        const existingSizes = item.sizes_quantities || [];
        const sizeIndex = existingSizes.findIndex(sq => sq.size === size);
        
        if (quantity > 0) {
          // Add or update size quantity
          if (sizeIndex >= 0) {
            existingSizes[sizeIndex].quantity = quantity;
          } else {
            existingSizes.push({ size, quantity });
          }
        } else {
          // Remove size if quantity is 0
          if (sizeIndex >= 0) {
            existingSizes.splice(sizeIndex, 1);
          }
        }
        
        return { ...item, sizes_quantities: existingSizes };
      })
    }));
  };

  const getSizeQuantity = (itemIndex: number, size: string): number => {
    const item = formData.order_items[itemIndex];
    const sizeQuantity = item.sizes_quantities?.find(sq => sq.size === size);
    return sizeQuantity?.quantity || 0;
  };

  const addOrderRemark = () => {
    setFormData(prev => ({
      ...prev,
      order_remarks: [...prev.order_remarks, '']
    }));
  };

  const updateOrderRemark = (remarkIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      order_remarks: prev.order_remarks.map((remark, i) => 
        i === remarkIndex ? value : remark
      )
    }));
  };

  const removeOrderRemark = (remarkIndex: number) => {
    setFormData(prev => ({
      ...prev,
      order_remarks: prev.order_remarks.filter((_, i) => i !== remarkIndex)
    }));
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

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.order_items.some(item => 
      item.design_number.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track all orders with multiple design items</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Order
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => setError('')}
            className="text-red-800 hover:text-red-900 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search orders by number, party name, or design..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <FilterIcon className="w-5 h-5 mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Party Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Design Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transport
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <PackageIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                          {order.order_number}
                        </div>
                        {/* Show order remarks if they exist */}
                        {order.order_remarks && order.order_remarks.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            <div className="flex items-center mb-1">
                              <FileTextIcon className="w-3 h-3 mr-1" />
                              <span className="font-medium">Remarks:</span>
                            </div>
                            <div className="space-y-1">
                              {order.order_remarks.slice(0, 2).map((remark, index) => (
                                <div key={remark.id} className="bg-yellow-50 px-2 py-1 rounded text-xs border">
                                  {remark.remark.length > 40 ? `${remark.remark.substring(0, 40)}...` : remark.remark}
                                </div>
                              ))}
                              {order.order_remarks.length > 2 && (
                                <div className="text-xs text-gray-400 italic">
                                  +{order.order_remarks.length - 2} more remarks
                                </div>
                              )}
                            </div>
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
                        <div className="flex items-center justify-between mb-1">
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
                              <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900 bg-white px-2 py-0.5 rounded text-xs border">
                                    {item.design_number}
                                  </span>
                                  <span className="text-gray-600 text-xs">
                                    {item.color}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {item.sizes_quantities?.map((sq, sqIndex) => (
                                    <span key={sqIndex} className="inline-block text-xs bg-blue-50 text-blue-700 px-1 py-0.5 rounded border">
                                      {sq.size}:{sq.quantity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Collapsed view - show summary
                          <div className="text-xs text-gray-600">
                            <div className="flex flex-wrap gap-1">
                              {order.order_items.slice(0, 3).map((item, index) => (
                                <span key={index} className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                                  {item.design_number}
                                </span>
                              ))}
                              {order.order_items.length > 3 && (
                                <span className="text-xs text-gray-500 px-1">
                                  +{order.order_items.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        No design items
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="flex items-center text-gray-900 mb-1">
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {formatDate(order.date_of_order)}
                      </div>
                      {order.expected_delivery_date && (
                        <div className="text-gray-600 text-xs">
                          Expected: {formatDate(order.expected_delivery_date)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.transport && (
                      <div className="flex items-center text-sm text-gray-900">
                        <TruckIcon className="w-3 h-3 mr-1" />
                        {order.transport}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      {order.status !== 'completed' && (
                        <button
                          onClick={() => handleCompleteOrder(order)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Mark as completed"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(order)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit order"
                      >
                        <Edit2Icon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(order.id, order.order_number)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete order"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No orders found matching your search' : 'No orders found'}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No orders found matching your search' : 'No orders found'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-gray-50 rounded-lg p-4 border">
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <PackageIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 font-mono bg-white px-2 py-1 rounded">
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
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Design Items:</p>
                    <div className="space-y-2">
                      {order.order_items.map((item, index) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border">
                          <div className="font-medium text-gray-900 mb-1">{item.design_number}</div>
                          <div className="text-gray-600 mb-1">Color: {item.color}</div>
                          <div className="text-gray-600">
                            {item.sizes_quantities?.map((sq, sqIndex) => (
                              <span key={sqIndex} className="inline-block mr-2 text-xs bg-gray-100 px-1 py-0.5 rounded">
                                {sq.size}: {sq.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mb-3">
                    <div className="flex items-center text-sm text-gray-900 mb-1">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      <span className="text-xs text-gray-600 mr-2">Order:</span>
                      {formatDate(order.date_of_order)}
                    </div>
                    {order.expected_delivery_date && (
                      <div className="text-xs text-gray-600 ml-4">
                        Expected: {formatDate(order.expected_delivery_date)}
                      </div>
                    )}
                  </div>

                  {/* Transport */}
                  {order.transport && (
                    <div className="mb-3">
                      <div className="flex items-center text-sm text-gray-900">
                        <TruckIcon className="w-3 h-3 mr-1" />
                        <span className="text-xs text-gray-600 mr-2">Transport:</span>
                        {order.transport}
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  {order.remarks && (
                    <div className="mb-3">
                      <div className="flex items-start text-sm text-gray-900">
                        <FileTextIcon className="w-3 h-3 mr-1 mt-0.5" />
                        <div>
                          <span className="text-xs text-gray-600 mr-2">Remarks:</span>
                          <span className="text-xs">{order.remarks}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Remarks */}
                  {order.order_remarks && order.order_remarks.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        <FileTextIcon className="w-3 h-3 inline mr-1" />
                        Order Remarks:
                      </div>
                      <div className="space-y-1">
                        {order.order_remarks.map((remark, index) => (
                          <div key={remark.id} className="text-xs bg-yellow-50 px-2 py-1 rounded border">
                            {remark.remark}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-2 border-t">
                    {order.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteOrder(order)}
                        className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50"
                        title="Mark as completed"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(order)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                      title="Edit order"
                    >
                      <Edit2Icon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(order.id, order.order_number)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Delete order"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingOrder ? 'Edit Order' : 'Create New Order'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Party Name *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.party_name}
                      onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      required
                    >
                      <option value="">Select a party</option>
                      {parties.map((party) => (
                        <option key={party.id} value={party.name}>
                          {party.party_id} - {party.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                  {parties.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      No parties found. Please create parties first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Or Enter Custom Party Name
                  </label>
                  <input
                    type="text"
                    value={formData.party_name}
                    onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter custom party name"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use this field if the party is not in the dropdown above
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Order *
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_order}
                    onChange={(e) => setFormData({ ...formData, date_of_order: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transport
                  </label>
                  <div className="relative">
                    <select
                      value={formData.transport}
                      onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">Select transport method</option>
                      {transportOptions.map((transport) => (
                        <option key={transport.id} value={transport.transport_name}>
                          {transport.transport_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                  {transportOptions.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      No transport options available.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Or Enter Custom Transport
                  </label>
                  <input
                    type="text"
                    value={formData.transport}
                    onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter custom transport method"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use this field if the transport method is not in the dropdown above
                  </p>
                </div>

                {editingOrder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter any remarks or notes"
                  rows={3}
                />
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Design Items
                  </label>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Item
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Add design items with sizes and quantities. Either design items or order remarks (or both) are required.
                </p>

                <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {formData.order_items.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Design</label>
                          <select
                            value={item.design_number}
                            onChange={(e) => updateOrderItem(index, 'design_number', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                          >
                            <option value="">Select Design</option>
                            {designs.map((design) => (
                              <option key={design.design_number} value={design.design_number}>
                                {design.design_number} - {design.item_type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                          <select
                            value={item.color}
                            onChange={(e) => updateOrderItem(index, 'color', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                            disabled={!item.design_number}
                          >
                            <option value="">Select Color</option>
                            {getAvailableColors(item.design_number).map((color) => (
                              <option key={color.id} value={color.color_name}>
                                {color.color_name}
                              </option>
                            ))}
                          </select>
                          {!item.design_number && (
                            <p className="text-xs text-gray-500 mt-1">
                              Select a design first
                            </p>
                          )}
                        </div>
                        <div className="flex items-end">
                          {formData.order_items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOrderItem(index)}
                              className="px-3 py-1 text-red-600 hover:text-red-800 text-sm border border-red-300 rounded hover:bg-red-50"
                            >
                              Remove Item
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Size Quantity Grid */}
                      {item.design_number && item.color && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Sizes & Quantities
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {commonSizes.map((size) => {
                              const quantity = getSizeQuantity(index, size);
                              return (
                                <div key={size} className="flex flex-col items-center">
                                  <label className="text-xs font-medium text-gray-600 mb-1">
                                    {size}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => updateOrderItemSizeQuantity(index, size, parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Enter quantities for each size. Leave blank or 0 for sizes not needed.
                          </p>
                        </div>
                      )}

                      {(!item.design_number || !item.color) && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          Select design and color to choose sizes and quantities
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Remarks Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Order Remarks
                  </label>
                  <button
                    type="button"
                    onClick={addOrderRemark}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Remark
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Add general remarks for this order. Either design items or order remarks (or both) are required.
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {formData.order_remarks.map((remark, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={remark}
                        onChange={(e) => updateOrderRemark(index, e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter remark for this order"
                      />
                      {formData.order_remarks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrderRemark(index)}
                          className="text-red-600 hover:text-red-800 text-sm px-3 py-2 border border-red-300 rounded-lg hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingOrder ? 'Update Order' : 'Create Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;