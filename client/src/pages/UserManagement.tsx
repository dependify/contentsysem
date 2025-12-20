// User Management page for admins
import { useState, useEffect } from 'react';
import { Users, Plus, Search, MoreHorizontal, Edit, Trash, Key, RefreshCw } from 'lucide-react';
import { 
  Button, Input, Card, Badge, Modal, Select, Dropdown, 
  Spinner, EmptyState, Pagination, ConfirmDialog, Avatar 
} from '../components/ui';
import api from '../lib/api';

interface User {
  id: number;
  email: string;
  role: string;
  tenant_id: number | null;
  tenant_name: string | null;
  created_at: string;
}

interface Tenant {
  id: number;
  business_name: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'client',
    tenant_id: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users', {
        params: { page, limit: 20, role: roleFilter || undefined }
      });
      if (response.data.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.total_pages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await api.get('/tenants');
      if (response.data.success) {
        setTenants(response.data.tenants);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [page, roleFilter]);

  const handleCreateUser = async () => {
    try {
      setFormLoading(true);
      setFormError('');
      const response = await api.post('/users', {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        tenant_id: formData.tenant_id ? parseInt(formData.tenant_id) : null,
      });
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ email: '', password: '', role: 'client', tenant_id: '' });
        fetchUsers();
      }
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      setFormLoading(true);
      setFormError('');
      const response = await api.put(`/users/${selectedUser.id}`, {
        email: formData.email,
        role: formData.role,
        tenant_id: formData.tenant_id ? parseInt(formData.tenant_id) : null,
      });
      if (response.data.success) {
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setFormLoading(true);
      await api.delete(`/users/${selectedUser.id}`);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      tenant_id: user.tenant_id?.toString() || '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const getRoleBadgeVariant = (role: string): 'primary' | 'success' | 'warning' | 'gray' => {
    switch (role) {
      case 'admin': return 'primary';
      case 'editor': return 'success';
      case 'viewer': return 'warning';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400">Manage user accounts and permissions</p>
        </div>
        <Button onClick={() => {
          setFormData({ email: '', password: '', role: 'client', tenant_id: '' });
          setFormError('');
          setShowCreateModal(true);
        }}>
          <Plus size={16} /> Add User
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="select w-40"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="client">Client</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <Button variant="ghost" size="icon" onClick={fetchUsers}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="w-16 h-16" />}
          title="No users found"
          description="Add users to give them access to ContentSys"
          action={<Button onClick={() => setShowCreateModal(true)}><Plus size={16} /> Add User</Button>}
        />
      ) : (
        <Card>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Tenant</th>
                <th>Created</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.email} size="sm" />
                      <div>
                        <p className="font-medium text-white">{user.email}</p>
                        <p className="text-xs text-gray-500">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td>
                    {user.tenant_name || <span className="text-gray-500">No tenant</span>}
                  </td>
                  <td className="text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Dropdown
                      trigger={<Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>}
                      align="right"
                      items={[
                        { label: 'Edit', icon: <Edit size={14} />, onClick: () => openEditModal(user) },
                        { label: 'Reset Password', icon: <Key size={14} />, onClick: () => {} },
                        { label: 'Delete', icon: <Trash size={14} />, onClick: () => { setSelectedUser(user); setShowDeleteConfirm(true); }, danger: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New User">
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {formError}
            </div>
          )}
          <Input
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'client', label: 'Client' },
              { value: 'editor', label: 'Editor' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />
          <Select
            label="Assign to Tenant"
            value={formData.tenant_id}
            onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
            placeholder="Select tenant (optional)"
            options={tenants.map(t => ({ value: t.id, label: t.business_name }))}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} loading={formLoading}>
            <Plus size={16} /> Create User
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User">
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {formError}
            </div>
          )}
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'client', label: 'Client' },
              { value: 'editor', label: 'Editor' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />
          <Select
            label="Assign to Tenant"
            value={formData.tenant_id}
            onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
            placeholder="Select tenant (optional)"
            options={tenants.map(t => ({ value: t.id, label: t.business_name }))}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button onClick={handleUpdateUser} loading={formLoading}>Save Changes</Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.email}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={formLoading}
      />
    </div>
  );
}
