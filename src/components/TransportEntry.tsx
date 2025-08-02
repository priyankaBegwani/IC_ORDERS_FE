import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  PlusIcon, 
  SearchIcon, 
  Edit2Icon, 
  Trash2Icon, 
  TruckIcon 
} from './icons/Icons';

interface Transport {
  id: number;
  transport_name: string;
  description: string;
  created_at: string;
}

const TransportEntry: React.FC = () => {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    transport_name: '',
    description: ''
  });

  const { token } = useAuth();
  const { refreshTransport } = useData();

  useEffect(() => {
    fetchTransports();
  }, []);

  const fetchTransports = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/transport', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transport options');
      }

      const data = await response.json();
      setTransports(data.transportOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transport options');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingTransport 
        ? `http://localhost:3001/api/transport/${editingTransport.id}`
        : 'http://localhost:3001/api/transport';
      
      const method = editingTransport ? 'PUT' : 'POST';

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
        throw new Error(errorData.error || `Failed to ${editingTransport ? 'update' : 'create'} transport option`);
      }

      resetForm();
      fetchTransports();
      refreshTransport(); // Refresh the global transport data
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingTransport ? 'update' : 'create'} transport option`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transport: Transport) => {
    setEditingTransport(transport);
    setFormData({
      transport_name: transport.transport_name,
      description: transport.description
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number, transportName: string) => {
    if (!confirm(`Are you sure you want to delete transport option "${transportName}"?`)) return;

    try {
      const response = await fetch(`http://localhost:3001/api/transport/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete transport option');
      }

      fetchTransports();
      refreshTransport(); // Refresh the global transport data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transport option');
    }
  };

  const resetForm = () => {
    setFormData({
      transport_name: '',
      description: ''
    });
    setShowCreateForm(false);
    setEditingTransport(null);
    setError('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTransports = transports.filter(transport =>
    transport.transport_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transport.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && transports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading transport options...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transport Entry</h1>
          <p className="text-gray-600 mt-1">Manage transport methods and delivery options</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Transport
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

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search transport options by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Transport Options Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transport Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransports.map((transport) => (
                <tr key={transport.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <TruckIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{transport.transport_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs">
                      {transport.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(transport.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(transport)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit transport option"
                      >
                        <Edit2Icon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(transport.id, transport.transport_name)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete transport option"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTransports.length === 0 && (
            <div className="text-center py-12">
              <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No transport options found matching your search' : 'No transport options found'}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredTransports.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No transport options found matching your search' : 'No transport options found'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredTransports.map((transport) => (
                <div key={transport.id} className="bg-gray-50 rounded-lg p-4 border">
                  {/* Transport Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <TruckIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{transport.transport_name}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {transport.description && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600">{transport.description}</p>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(transport.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-2 border-t">
                    <button
                      onClick={() => handleEdit(transport)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                      title="Edit transport option"
                    >
                      <Edit2Icon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(transport.id, transport.transport_name)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Delete transport option"
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

      {/* Create/Edit Transport Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingTransport ? 'Edit Transport Option' : 'Create New Transport Option'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transport Name *
                </label>
                <input
                  type="text"
                  value={formData.transport_name}
                  onChange={(e) => setFormData({ ...formData, transport_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter transport name (e.g., Express Delivery)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description (optional)"
                  rows={3}
                />
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
                  {loading ? 'Saving...' : (editingTransport ? 'Update Transport' : 'Create Transport')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportEntry;