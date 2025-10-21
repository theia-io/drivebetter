'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/auth'
import { Button } from './ui'
import { Menu, User, X, Bell } from 'lucide-react'
import {getDriverInboxCount, useDriverInboxCount} from '@/stores/rideShares' // expects: () => Promise<{ count: number }>

type NavItem = {
    name: string
    href: string
    requiredRoles?: string[]
}

const navigation: NavItem[] = [
    { name: 'Groups', href: '/groups', requiredRoles: ['driver', 'dispatcher', 'admin'] },
    { name: 'Rides', href: '/rides', requiredRoles: ['driver', 'dispatcher', 'admin'] },
    { name: 'New Rides', href: '/shared-rides', requiredRoles: ['driver', 'dispatcher', 'admin'] },
    { name: 'Users', href: '/users', requiredRoles: ['admin', 'dispatcher'] },
]

const getNavigationForUser = (item: NavItem, userRoles?: string[]): NavItem => {
    if (item.name !== 'Users') return item
    const roles = userRoles || []
    if (roles.includes('admin')) return item
    if (roles.includes('dispatcher')) {
        return { ...item, name: 'Drivers', href: '/users?role=driver' }
    }
    return item
}

const hasRequiredRole = (userRoles?: string[], requiredRoles?: string[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true
    return Array.isArray(userRoles) && requiredRoles.some((r) => userRoles.includes(r))
}

export default function Navigation() {
    const pathname = usePathname()
    const { user, logout } = useAuthStore()
    const userRoles = user?.roles
    const [open, setOpen] = useState(false)

    const items = useMemo(
        () =>
            navigation
                .filter((item) => hasRequiredRole(userRoles, item.requiredRoles))
                .map((item) => getNavigationForUser(item, userRoles)),
        [userRoles]
    )

    const isActive = (href: string) => {
        const base = href.split('?')[0]
        return pathname === href || pathname === base
    }

    const isDriver = !!userRoles?.includes('driver')
    const { data: inboxCountData } = useDriverInboxCount('available');
    const newRidesCount = inboxCountData?.count ?? 0

    const renderNavLabel = (item: NavItem) => {
        if (item.name !== 'New Rides') return item.name

        return (
            <span className="inline-flex items-center gap-1.5">
        <Bell className="h-4 w-4" />
        <span>New Rides</span>
                {isDriver && newRidesCount > 0 && (
                    <span
                        className="ml-0.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white
                       text-[10px] font-semibold px-1.5 min-w-[1.1rem] h-4 leading-none"
                        aria-label={`${newRidesCount} new rides`}
                    >
            {newRidesCount > 99 ? '99+' : newRidesCount}
          </span>
                )}
      </span>
        )
    }

    return (
        <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left: brand + desktop links */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">DriveBetter</h1>
                        </div>

                        {/* Desktop menu */}
                        <div className="ml-6 hidden sm:flex sm:space-x-8">
                            {items.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        isActive(item.href)
                                            ? 'border-indigo-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    {renderNavLabel(item)}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: user actions */}
                    <div className="flex items-center">
                        <div className="hidden sm:flex items-center space-x-4">
                            <Link
                                href="/account"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    pathname === '/account'
                                        ? 'border-indigo-500 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                            >
                                <User size={24} /> {user?.name}
                            </Link>
                            <Button variant="outline" size="sm" onClick={logout}>
                                Logout
                            </Button>
                        </div>

                        {/* Mobile: hamburger */}
                        <button
                            type="button"
                            className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100"
                            onClick={() => setOpen((v) => !v)}
                            aria-label="Toggle menu"
                        >
                            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile panel */}
            {open && (
                <div className="sm:hidden border-t">
                    <div className="pt-2 pb-3 space-y-1">
                        {items.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={`flex items-center justify-between pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                    isActive(item.href)
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                            >
                                <span className="inline-flex items-center gap-2">{renderNavLabel(item)}</span>

                                {/* On mobile, also show count bubble for New Rides */}
                                {item.name === 'New Rides' && isDriver && newRidesCount > 0 && (
                                    <span
                                        className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white
                               text-xs font-semibold px-2 min-w-[1.25rem] h-5 leading-none"
                                        aria-label={`${newRidesCount} new rides`}
                                    >
                    {newRidesCount > 99 ? '99+' : newRidesCount}
                  </span>
                                )}
                            </Link>
                        ))}
                    </div>
                    <div className="border-t px-4 py-3 space-y-2">
                        <Link href="/account" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-900">
                            {user?.name}
                        </Link>
                        <div className="flex items-center justify-between">
                            <Button variant="outline" size="sm" onClick={logout}>
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}