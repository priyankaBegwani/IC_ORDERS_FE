import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  PlusIcon, 
  SearchIcon, 
  Edit2Icon, 
  Trash2Icon, 
  EyeIcon, 
  PaletteIcon, 
  PackageIcon 
} from './icons/Icons';

interface Design {
  id: string;
  design_number: string;
  item_type_id: number;
  color_id: number;
  created_at: string;
  user_profiles: {
    name: string;
  };
  itemtype: {
    itemtype: string;
  };
  colors: {
    color_name: string;
    primary_color: string;
  };
  design_sizes?: {
    size: string;
    quantity: number;
  }[];
}

const DesignEntry: React.FC = () => {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    design_number: '',
    item_type_id: '',
    color_ids: [] as number[]
  });

  const { token } = useAuth();
  const { itemTypes, colors, itemTypesError, colorsError, refreshItemTypes, refreshColors } = useData();

  useEffect(() => {
    fetchDesigns();
    setLoading(false);
  }, []);

  // Set errors from data context
  useEffect(() => {
    if (itemTypesError) setError(itemTypesError);
    if (colorsError) setError(colorsError);
  }, [itemTypesError, colorsError]);

  const fetchDesigns = async () => {
    const response = await fetch('http://localhost:3001/api/designs', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch designs');
    }

    const data = await response.json();
    setDesigns(data.designs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingDesign) {
        // For editing, we only update one design entry
        const response = await fetch(`http://localhost:3001/api/designs/${editingDesign.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            design_number: formData.design_number,
            item_type_id: formData.item_type_id,
            color_id: formData.color_ids[0] // For editing, we only allow one color
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update design');
        }
      } else {
        // For creating, we send multiple color IDs
        const response = await fetch('http://localhost:3001/api/designs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create design');
        }
      }

      resetForm();
      fetchDesigns();
      refreshItemTypes(); // Refresh in case new item types were referenced
      refreshColors(); // Refresh in case new colors were referenced
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save design');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (design: Design) => {
    setEditingDesign(design);
    
    // Get all colors for this design number and item type
    const designGroup = designs.filter(d => 
      d.design_number === design.design_number && 
      d.item_type_id === design.item_type_id
    );
    const colorIds = designGroup.map(d => d.color_id);
    
    setFormData({
      design_number: design.design_number,
      item_type_id: design.item_type_id.toString(),
      color_ids: colorIds
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/designs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete design');
      }

      fetchDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const handleDeleteDesignGroup = async (designGroup: Design[]) => {
    if (!confirm(`Are you sure you want to delete design "${designGroup[0].design_number}" with all its colors?`)) return;

    try {
      // Delete all designs in the group
      await Promise.all(
        designGroup.map(design =>
          fetch(`http://localhost:3001/api/designs/${design.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
        )
      );

      fetchDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const resetForm = () => {
    setFormData({ 
      design_number: '', 
      item_type_id: '', 
      color_ids: []
    });
    setShowCreateForm(false);
    setEditingDesign(null);
    setError('');
  };

  const handleColorToggle = (colorId: number) => {
    setFormData(prev => ({
      ...prev,
      color_ids: prev.color_ids.includes(colorId)
        ? prev.color_ids.filter(id => id !== colorId)
        : [...prev.color_ids, colorId]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredDesigns = designs.filter(design =>
    design.design_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    design.itemtype?.itemtype.toLowerCase().includes(searchTerm.toLowerCase()) ||
    design.colors?.color_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group designs by design number for display
  const groupedDesigns = filteredDesigns.reduce((acc, design) => {
    const key = `${design.design_number}-${design.item_type_id}`;
    if (!acc[key]) {
      acc[key] = {
        design_number: design.design_number,
        item_type: design.itemtype?.itemtype,
        colors: [],
        created_by: design.user_profiles?.name,
        created_at: design.created_at,
        designs: []
      };
    }
    acc[key].colors.push(design.colors);
    acc[key].designs.push(design);
    return acc;
  }, {} as Record<string, any>);

  const groupedDesignsList = Object.values(groupedDesigns);

  if (loading && designs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading designs...</div>
      </div>
    );
  }

  // Group colors by primary color for better UI
  const colorsByFamily = colors.reduce((acc, color) => {
    if (!acc[color.primary_color]) {
      acc[color.primary_color] = [];
    }
    acc[color.primary_color].push(color);
    return acc;
  }, {} as Record<string, Color[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Design Entry</h1>
          <p className="text-gray-600 mt-1">Manage design patterns with item types and colors</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Design
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
            placeholder="Search designs by number, item type, or color..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Designs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Design Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedDesignsList.map((group, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <PackageIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{group.design_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {group.item_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1">
                      {group.colors.map((color: any, colorIndex: number) => (
                        <span
                          key={colorIndex}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border"
                          title={color.color_name}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-1 border border-gray-300" 
                            style={{ backgroundColor: color.primary_color || '#ccc' }}
                          ></div>
                          {color.color_name}
                        </span>
                      ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{group.created_by}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(group.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(group.designs[0])}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit design"
                      >
                        <Edit2Icon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDesignGroup(group.designs)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete entire design"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {groupedDesignsList.length === 0 && (
            <div className="text-center py-12">
              <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No designs found matching your search' : 'No designs found'}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {groupedDesignsList.length === 0 ? (
            <div className="text-center py-12">
              <EyeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No designs found matching your search' : 'No designs found'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {groupedDesignsList.map((group, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                  {/* Design Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <PackageIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{group.design_number}</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {group.item_type}
                    </span>
                  </div>

                  {/* Colors */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Colors:</p>
                    <div className="flex flex-wrap gap-1">
                      {group.colors.map((color: any, colorIndex: number) => (
                        <span
                          key={colorIndex}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-white text-gray-800 border"
                          title={color.color_name}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-1 border border-gray-300" 
                            style={{ backgroundColor: color.primary_color || '#ccc' }}
                          ></div>
                          {color.color_name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Created Info */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Created by:</span> {group.created_by}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(group.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-2 border-t">
                    <button
                      onClick={() => handleEdit(group.designs[0])}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                      title="Edit design"
                    >
                      <Edit2Icon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDesignGroup(group.designs)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Delete entire design"
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

      {/* Create/Edit Design Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingDesign ? 'Edit Design' : 'Create New Design'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Design Number *
                </label>
                <input
                  type="text"
                  value={formData.design_number}
                  onChange={(e) => setFormData({ ...formData, design_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter design number (e.g., D001)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Type *
                </label>
                <select
                  value={formData.item_type_id}
                  onChange={(e) => setFormData({ ...formData, item_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select an item type</option>
                  {itemTypes.map((itemType) => (
                    <option key={itemType.id} value={itemType.id}>
                     {itemType.itemtype}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Colors * (Select multiple colors)
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4">
                  {Object.entries(colorsByFamily).map(([family, familyColors]) => (
                    <div key={family} className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                        {family} Family
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {familyColors.map((color) => (
                          <label
                            key={color.id}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                              formData.color_ids.includes(color.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.color_ids.includes(color.id)}
                              onChange={() => handleColorToggle(color.id)}
                              className="mr-3"
                            />
                            <div 
                              className="w-4 h-4 rounded-full mr-2 border border-gray-300 flex-shrink-0" 
                              style={{ backgroundColor: color.primary_color || '#ccc' }}
                            ></div>
                            <span className="text-sm font-medium">{color.color_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {formData.color_ids.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">Please select at least one color</p>
                )}
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
                  disabled={loading || formData.color_ids.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingDesign ? 'Update Design' : 'Create Design')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignEntry;