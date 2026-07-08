"use client"

import { UserAvatar } from "@/components/common/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, ShieldOff, Building2, Briefcase } from "lucide-react"

interface ProfileHeaderProps {
    name: string
    email: string
    avatarUrl?: string
    position?: string
    department?: string
    roles?: string[]
    twoFactorEnabled?: boolean
}

export function ProfileHeader({
    name,
    email,
    avatarUrl,
    position,
    department,
    roles = [],
    twoFactorEnabled = false,
}: ProfileHeaderProps) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar */}
                    <UserAvatar
                        fullName={name}
                        avatarUrl={avatarUrl}
                        className="h-24 w-24"
                        fallbackClassName="text-2xl font-semibold bg-primary text-primary-foreground"
                    />

                    {/* User Info */}
                    <div className="flex-1 text-center sm:text-left space-y-3">
                        <div>
                            <h1 className="text-2xl font-bold">{name}</h1>
                            <p className="text-muted-foreground">{email}</p>
                        </div>

                        {/* Position & Department */}
                        <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
                            {position && (
                                <div className="flex items-center gap-1">
                                    <Briefcase className="h-4 w-4" />
                                    <span>{position}</span>
                                </div>
                            )}
                            {department && (
                                <div className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    <span>{department}</span>
                                </div>
                            )}
                        </div>

                        {/* Roles & 2FA Status */}
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                            {roles.map((role) => (
                                <Badge key={role} variant="secondary">
                                    {role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                                </Badge>
                            ))}
                            {twoFactorEnabled ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    2FA Enabled
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-600">
                                    <ShieldOff className="h-3 w-3 mr-1" />
                                    2FA Disabled
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
