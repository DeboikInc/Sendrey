// src/pages/auth/Register.jsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerAdmin } from '../../Redux/authSlice';
import { Link } from "react-router-dom";
import Button from '../../components/ui/Button';


// testadmin@gmail.com
// testadmin123
// Test 
// Admin
// 08020800009

const Register = () => {
    const dispatch = useDispatch();
    const { status, error } = useSelector(state => state.auth);
    const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'admin' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState('');

    const validate = () => {
        const errors = {};
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!formData.phone.trim()) errors.phone = 'Phone number is required';
        else if (!/^\+?[0-9]{10,14}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = 'Invalid phone number';
        if (!formData.email) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email address';
        if (!formData.password) errors.password = 'Password is required';
        else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
        return errors;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (fieldErrors[e.target.name]) setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length) return setFieldErrors(errors);

        const result = await dispatch(registerAdmin(formData));
        if (registerAdmin.fulfilled.match(result)) {
            setSuccess('Account created successfully. Check your email to verify.');
            setFormData({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'admin' });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black-100 px-4">
            <div className="w-full max-w-lg">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">
                            {success}
                        </div>
                    )}

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-secondary mb-2">Create Account</h1>
                        <p className="text-gray-500">Sign up to get started</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">First Name</label>
                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} autoComplete="off"
                                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black-100 ${fieldErrors.firstName ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="John" />
                                {fieldErrors.firstName && <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">Last Name</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} autoComplete="off"
                                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black-100 ${fieldErrors.lastName ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="Doe" />
                                {fieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Phone Number</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} autoComplete="off"
                                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black-100 ${fieldErrors.phone ? 'border-red-400' : 'border-gray-300'}`}
                                placeholder="+234 800 000 0000" />
                            {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} autoComplete="off"
                                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black-100 ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'}`}
                                placeholder="you@example.com" />
                            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Password</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} autoComplete="new-password"
                                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black-100 ${fieldErrors.password ? 'border-red-400' : 'border-gray-300'}`}
                                placeholder="••••••••" />
                            {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                        </div>

                        <Button type="submit" variant="primary" size="lg" fullWidth isLoading={status === 'loading'} loadingText="Creating account..." className="mt-6">
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link to="/" className="text-primary font-medium hover:text-secondary transition-colors">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;