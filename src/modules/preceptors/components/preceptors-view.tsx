"use client";

import { UserCheck, Users, UserX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatStrip } from "@/shared/components/stat-strip";
import { PreceptorCard } from "./preceptor-card";
import type { PreceptorWithMembers } from "../queries/get-preceptors-with-members";
import type { UnassignedMember } from "../queries/get-unassigned-members";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PreceptorsViewProps {
  preceptors: PreceptorWithMembers[];
  unassignedMembers: UnassignedMember[];
  canManage: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PreceptorsView({
  preceptors,
  unassignedMembers,
  canManage,
}: PreceptorsViewProps) {
  const totalPreceptores = preceptors.length;
  const totalPreceptorados = preceptors.reduce(
    (acc, p) => acc + p.members.length,
    0
  );
  const mediaPorPreceptor =
    totalPreceptores > 0 ? totalPreceptorados / totalPreceptores : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Preceptores</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os preceptores e seus preceptorados.
        </p>
      </div>

      {/* Summary Cards */}
      <StatStrip desktopCols={4}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Total de Preceptores
            </CardDescription>
            <UserCheck className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPreceptores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Total de Preceptorados
            </CardDescription>
            <Users className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPreceptorados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Média por Preceptor
            </CardDescription>
            <Users className="size-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mediaPorPreceptor.toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Sem Preceptor
            </CardDescription>
            <UserX className="size-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {unassignedMembers.length}
            </div>
          </CardContent>
        </Card>
      </StatStrip>

      {/* Preceptor Cards */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {preceptors.map((preceptor) => (
          <PreceptorCard
            key={preceptor.id}
            preceptor={preceptor}
            unassignedMembers={unassignedMembers}
            canManage={canManage}
          />
        ))}
      </div>

      {/* Unassigned Members Section */}
      {unassignedMembers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserX className="size-5 text-orange-600" />
              <div>
                <h3 className="text-base font-semibold">
                  Sócios sem Preceptor
                </h3>
                <p className="text-xs text-muted-foreground">
                  {unassignedMembers.length} sócio(s) ainda não atribuído(s) a
                  nenhum preceptor.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unassignedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {member.fullName}
                  </span>
                  <Badge
                    variant="outline"
                    className="ml-auto text-xs text-orange-600 border-orange-200"
                  >
                    Sem preceptor
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
