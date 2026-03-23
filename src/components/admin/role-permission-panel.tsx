"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createRole,
  deleteRole,
  getRoleById,
  getRolePermissions,
  getRoles,
  updateRole,
} from "@/lib/admin/service";
import type { RoleListItem } from "@/lib/admin/types";

interface RolePermissionPanelProps {
  authorization?: string;
}

type RoleModalMode = "create" | "edit";

interface RoleFormState {
  id: number | null;
  roleName: string;
  functionCodes: string[];
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Thao tac that bai. Vui long thu lai.";
};

const formatFunctionCodes = (codes?: string[]): string => {
  if (!codes || codes.length === 0) {
    return "-";
  }

  return codes.join(", ");
};

export const RolePermissionPanel = ({
  authorization,
}: RolePermissionPanelProps) => {
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleKeyword, setRoleKeyword] = useState("");
  const [permissionKeyword, setPermissionKeyword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<RoleModalMode>("create");
  const [roleForm, setRoleForm] = useState<RoleFormState>({
    id: null,
    roleName: "",
    functionCodes: [],
  });

  const runAction = useCallback(async (action: () => Promise<void>) => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      await action();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRolesAndPermissions = useCallback(async () => {
    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    await runAction(async () => {
      const [roleRows, permissionRows] = await Promise.all([
        getRoles(authorization),
        getRolePermissions(authorization),
      ]);

      setRoles(roleRows);
      setPermissions(permissionRows);
      setSuccessMessage(
        `Da tai ${roleRows.length} role va ${permissionRows.length} permissions.`,
      );
    });
  }, [authorization, runAction]);

  useEffect(() => {
    void loadRolesAndPermissions();
  }, [loadRolesAndPermissions]);

  const filteredRoles = useMemo(() => {
    const keyword = roleKeyword.trim().toLowerCase();
    if (!keyword) {
      return roles;
    }

    return roles.filter((role) => {
      const roleName = role.roleName?.toLowerCase() || "";
      const codeText = (role.functionCodes || []).join(" ").toLowerCase();
      return roleName.includes(keyword) || codeText.includes(keyword);
    });
  }, [roleKeyword, roles]);

  const filteredPermissions = useMemo(() => {
    const keyword = permissionKeyword.trim().toLowerCase();
    if (!keyword) {
      return permissions;
    }

    return permissions.filter((permission) =>
      permission.toLowerCase().includes(keyword),
    );
  }, [permissionKeyword, permissions]);

  const openCreateRoleModal = () => {
    setErrorMessage("");
    setRoleModalMode("create");
    setRoleForm({
      id: null,
      roleName: "",
      functionCodes: [],
    });
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = async (roleId: number) => {
    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    await runAction(async () => {
      const role = await getRoleById(roleId, authorization);
      setRoleModalMode("edit");
      setRoleForm({
        id: role.id,
        roleName: role.roleName || "",
        functionCodes: role.functionCodes || [],
      });
      setIsRoleModalOpen(true);
    });
  };

  const closeRoleModal = () => {
    if (isLoading) {
      return;
    }
    setIsRoleModalOpen(false);
  };

  const toggleFunctionCode = (functionCode: string) => {
    setRoleForm((prev) => {
      const exists = prev.functionCodes.includes(functionCode);
      return {
        ...prev,
        functionCodes: exists
          ? prev.functionCodes.filter((item) => item !== functionCode)
          : [...prev.functionCodes, functionCode],
      };
    });
  };

  const handleSubmitRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    const roleName = roleForm.roleName.trim();
    if (!roleName) {
      setErrorMessage("Vui long nhap ten role.");
      return;
    }

    const functionCodes = [...new Set(roleForm.functionCodes)];

    await runAction(async () => {
      if (roleModalMode === "create") {
        const createdRole = await createRole(
          {
            roleName,
            functionCodes,
          },
          authorization,
        );

        setSuccessMessage(`Tao role thanh cong: ${createdRole.roleName || roleName}.`);
      } else {
        if (!roleForm.id) {
          throw new Error("Khong tim thay role ID de cap nhat.");
        }

        const updatedRole = await updateRole(
          roleForm.id,
          {
            roleName,
            functionCodes,
          },
          authorization,
        );

        setSuccessMessage(
          `Cap nhat role thanh cong: ${updatedRole.roleName || roleName}.`,
        );
      }

      setIsRoleModalOpen(false);
      const roleRows = await getRoles(authorization);
      setRoles(roleRows);
    });
  };

  const handleDeleteRole = async (role: RoleListItem) => {
    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    if (!role.id) {
      setErrorMessage("Khong tim thay role ID de xoa.");
      return;
    }

    const accepted = window.confirm(
      `Ban co chac muon xoa role "${role.roleName || role.id}"?`,
    );
    if (!accepted) {
      return;
    }

    await runAction(async () => {
      await deleteRole(role.id, authorization);
      const roleRows = await getRoles(authorization);
      setRoles(roleRows);
      setSuccessMessage(`Da xoa role ${role.roleName || role.id}.`);
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[8px] border border-[#8ab3d1] bg-white shadow-[0_1px_2px_rgba(7,51,84,0.16)]">
        <div className="flex items-center justify-between border-b border-[#c5dced] px-4 py-2 text-[18px] font-semibold text-[#1a4f75]">
          <h2>Quan ly role</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreateRoleModal}
              disabled={isLoading}
              className="rounded-[4px] bg-[#0d6ea6] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
            >
              Tao role
            </button>
            <button
              type="button"
              onClick={() => {
                void loadRolesAndPermissions();
              }}
              disabled={isLoading}
              className="rounded-[4px] border border-[#9ec3dd] bg-white px-3 py-1.5 text-sm font-semibold text-[#165a83] transition hover:bg-[#edf6fd] disabled:opacity-60"
            >
              Lam moi
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="max-w-[420px]">
            <input
              className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
              placeholder="Tim role theo ten hoac function code..."
              value={roleKeyword}
              onChange={(event) => setRoleKeyword(event.target.value)}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-[4px] border border-[#e8b2b2] bg-[#fff4f4] px-3 py-2 text-sm text-[#b03d3d]">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-[4px] border border-[#b3dbc1] bg-[#f2fbf5] px-3 py-2 text-sm text-[#2f7b4f]">
              {successMessage}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#cfdfec] text-[#305970]">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Role name</th>
                  <th className="px-2 py-2">Function codes</th>
                  <th className="px-2 py-2">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="border-b border-[#e0ebf4] text-[#1f3344]">
                    <td className="px-2 py-2">{role.id}</td>
                    <td className="px-2 py-2">{role.roleName || "-"}</td>
                    <td className="px-2 py-2">
                      <span className="line-clamp-2">{formatFunctionCodes(role.functionCodes)}</span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex min-w-[160px] items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void openEditRoleModal(role.id);
                          }}
                          disabled={isLoading}
                          className="h-9 rounded-[6px] border border-[#9ec3dd] bg-white px-3 text-xs font-semibold text-[#245977] transition hover:bg-[#edf6fd] disabled:opacity-60"
                        >
                          Sua
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteRole(role);
                          }}
                          disabled={isLoading}
                          className="h-9 rounded-[6px] bg-[#cc3a3a] px-3 text-xs font-semibold text-white transition hover:bg-[#aa2e2e] disabled:opacity-60"
                        >
                          Xoa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-center text-[#577086]">
                      Chua co du lieu role.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-[#8ab3d1] bg-white shadow-[0_1px_2px_rgba(7,51,84,0.16)]">
        <div className="flex items-center justify-between border-b border-[#c5dced] px-4 py-2 text-[18px] font-semibold text-[#1a4f75]">
          <h2>Tap permission he thong</h2>
          <span className="text-sm font-medium text-[#396786]">
            {permissions.length} permissions
          </span>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="max-w-[420px]">
            <input
              className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
              placeholder="Tim permission..."
              value={permissionKeyword}
              onChange={(event) => setPermissionKeyword(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredPermissions.length > 0 ? (
              filteredPermissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full border border-[#9ec3dd] bg-[#edf5fb] px-3 py-1 text-xs font-semibold text-[#1f5d86]"
                >
                  {permission}
                </span>
              ))
            ) : (
              <p className="text-sm text-[#577086]">Khong tim thay permission.</p>
            )}
          </div>
        </div>
      </section>

      {isRoleModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08273f]/55 px-3 py-6 backdrop-blur-[1px]"
          onClick={closeRoleModal}
        >
          <div
            className="w-full max-w-[860px] rounded-[14px] border border-[#8db7d5] bg-white shadow-[0_18px_60px_rgba(7,35,62,0.36)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#d2e4f1] px-5 py-3">
              <h3 className="text-[20px] font-semibold text-[#154f75]">
                {roleModalMode === "create"
                  ? "Tao role moi"
                  : `Cap nhat role #${roleForm.id}`}
              </h3>
              <button
                type="button"
                onClick={closeRoleModal}
                className="rounded-full border border-[#bdd5e7] px-2 py-0.5 text-xl leading-none text-[#346180] transition hover:bg-[#edf6fd]"
                disabled={isLoading}
                aria-label="Dong popup"
              >
                ×
              </button>
            </div>

            <form className="space-y-3 px-5 py-4" onSubmit={handleSubmitRole}>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-[#2c5877]">Role name</span>
                <input
                  className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
                  placeholder="VD: STUDENT, LECTURER, ADMIN_SUPPORT"
                  value={roleForm.roleName}
                  onChange={(event) =>
                    setRoleForm((prev) => ({
                      ...prev,
                      roleName: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#2c5877]">
                  Gan permissions (function codes)
                </p>
                <div className="max-h-[280px] overflow-y-auto rounded-[8px] border border-[#d2e4f1] p-3">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {permissions.map((permission) => {
                      const checked = roleForm.functionCodes.includes(permission);
                      return (
                        <label
                          key={permission}
                          className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-[#d8e6f2] bg-[#f9fcff] px-2.5 py-2 text-sm text-[#1f3344]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFunctionCode(permission)}
                          />
                          <span className="break-all">{permission}</span>
                        </label>
                      );
                    })}
                    {permissions.length === 0 ? (
                      <p className="text-sm text-[#577086]">Chua tai duoc permission.</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  className="h-10 rounded-[6px] border border-[#9ec3dd] bg-white px-4 text-sm font-semibold text-[#245977] transition hover:bg-[#edf6fd] disabled:opacity-60"
                  disabled={isLoading}
                >
                  Huy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 rounded-[6px] bg-[#0d6ea6] px-4 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
                >
                  {isLoading
                    ? "Dang xu ly..."
                    : roleModalMode === "create"
                      ? "Tao role"
                      : "Luu thay doi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
