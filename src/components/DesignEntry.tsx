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
      const response = await fetch(`${process.env.API_URL}/api/designs`, {
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
          const response = await fetch(`${process.env.API_URL}/api/designs/${editingDesign.id}`, {
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
          const response = await fetch(`${process.env.API_URL}/api/designs`, {
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
        const response = await fetch(`${process.env.API_URL}/api/designs/${id}`, {
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
            fetch(`${process.env.API_URL}/api/designs/${design.id}`, {
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
      <div className="flex h-64 items-center justify-center">
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
          <p className="mt-1 text-gray-600">Manage design patterns with item types and colors</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          New Design
        </button>
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

      {/* Search */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="relative">
          <SearchIcon className="-translate-y-1/2 absolute left-3 top-1/2 h-5 w-5 transform text-gray-400" />
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
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Design Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Item Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Colors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {groupedDesignsList.map((group, index) => (
                <tr key={index} className="transition-colors duration-200 hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <PackageIcon className="mr-2 h-4 w-4 text-gray-400" />
                      <div className="text-sm font-medium text-gray-900">{group.design_number}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                      {group.item_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1">
                      {group.colors.map((color: any, colorIndex: number) => (
                        <span
                          key={colorIndex}
                          className="inline-flex items-center rounded-full border bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
                          title={color.color_name}
                        >
                          <div 
                            className="mr-1 h-3 w-3 rounded-full border border-gray-300" 
                            style={{ backgroundColor: color.primary_color || '#ccc' }}
                          ></div>
                          {color.color_name}
                        </span>
                      ))}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">{group.created_by}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">{formatDate(group.created_at)}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(group.designs[0])}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit design"
                      >
                        <Edit2Icon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDesignGroup(group.designs)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete entire design"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {groupedDesignsList.length === 0 && (
            <div className="py-12 text-center">
              <EyeIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm ? 'No designs found matching your search' : 'No designs found'}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {groupedDesignsList.length === 0 ? (
            <div className="py-12 text-center">
              <EyeIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm ? 'No designs found matching your search' : 'No designs found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {groupedDesignsList.map((group, index) => (
                <div key={index} className="rounded-lg border bg-gray-50 p-4">
                  {/* Design Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <PackageIcon className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{group.design_number}</span>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                      {group.item_type}
                    </span>
                  </div>

                  {/* Colors */}
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-medium text-gray-700">Colors:</p>
                    <div className="flex flex-wrap gap-1">
                      {group.colors.map((color: any, colorIndex: number) => (
                        <span
                          key={colorIndex}
                          className="inline-flex items-center rounded-full border bg-white px-2 py-1 text-xs font-medium text-gray-800"
                          title={color.color_name}
                        >
                          <div 
                            className="mr-1 h-3 w-3 rounded-full border border-gray-300" 
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
                  <div className="flex justify-end space-x-2 border-t pt-2">
                    <button
                      onClick={() => handleEdit(group.designs[0])}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                      title="Edit design"
                    >
                      <Edit2Icon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDesignGroup(group.designs)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Delete entire design"
                    >
                      <Trash2Icon className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {editingDesign ? 'Edit Design' : 'Create New Design'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Colors * (Select multiple colors)
                </label>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-300 p-4">
                  {Object.entries(colorsByFamily).map(([family, familyColors]) => (
                    <div key={family} className="mb-4">
                      <h4 className="mb-2 text-sm font-medium capitalize text-gray-700">
                        {family} Family
                      </h4>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                              className="mr-2 h-4 w-4 flex-shrink-0 rounded-full border border-gray-300" 
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
                  <p className="mt-1 text-sm text-red-500">Please select at least one color</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors duration-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || formData.color_ids.length === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50"
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