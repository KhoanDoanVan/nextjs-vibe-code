"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createAccount,
  getAccountById,
  getAccounts,
  getRoles,
  resetAccountPassword,
  updateAccount,
  updateAccountStatus,
} from "@/lib/admin/service";
import type {
  AccountListItem,
  AccountStatus,
  PagedRows,
  RoleListItem,
} from "@/lib/admin/types";

interface AccountManagementPanelProps {
  authorization?: string;
}

type AccountModalMode = "create" | "edit";
type FilterRoleValue = "ALL" | `${number}`;
type FilterStatusValue = "ALL" | AccountStatus;

interface AccountFormState {
  id: number | null;
  username: string;
  password: string;
  confirmPassword: string;
  roleId: string;
  avatarUrl: string;
  desiredStatus: AccountStatus;
}

interface ResetPasswordFormState {
  newPassword: string;
  confirmPassword: string;
}

const accountStatusOptions: AccountStatus[] = ["ACTIVE", "INACTIVE", "LOCKED"];

const isAccountStatus = (value: unknown): value is AccountStatus => {
  return (
    value === "ACTIVE" || value === "INACTIVE" || value === "LOCKED"
  );
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Thao tac that bai. Vui long thu lai.";
};

const emptyAccounts: PagedRows<AccountListItem> = { rows: [] };

const buildStatusDraftMap = (
  rows: AccountListItem[],
): Record<number, AccountStatus> => {
  const draftMap: Record<number, AccountStatus> = {};

  for (const row of rows) {
    if (isAccountStatus(row.status)) {
      draftMap[row.id] = row.status;
    }
  }

  return draftMap;
};

const parseRoleId = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const AccountManagementPanel = ({
  authorization,
}: AccountManagementPanelProps) => {
  const [accounts, setAccounts] = useState<PagedRows<AccountListItem>>(emptyAccounts);
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [statusDraftByAccountId, setStatusDraftByAccountId] = useState<
    Record<number, AccountStatus>
  >({});

  const [keywordFilter, setKeywordFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<FilterRoleValue>("ALL");
  const [statusFilter, setStatusFilter] = useState<FilterStatusValue>("ALL");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalMode, setAccountModalMode] =
    useState<AccountModalMode>("create");
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    id: null,
    username: "",
    password: "",
    confirmPassword: "",
    roleId: "",
    avatarUrl: "",
    desiredStatus: "ACTIVE",
  });

  const [resetTargetAccount, setResetTargetAccount] =
    useState<AccountListItem | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordFormState>(
    {
      newPassword: "",
      confirmPassword: "",
    },
  );

  const resolveAccountFilters = useCallback(() => {
    const trimmedKeyword = keywordFilter.trim();
    const roleId = roleFilter === "ALL" ? undefined : Number(roleFilter);
    const status = statusFilter === "ALL" ? undefined : statusFilter;

    return {
      keyword: trimmedKeyword || undefined,
      roleId,
      status,
      page: 0,
      size: 20,
      sortBy: "createdAt",
    };
  }, [keywordFilter, roleFilter, statusFilter]);

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

  const loadInitialData = useCallback(async () => {
    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    await runAction(async () => {
      const [roleRows, accountRows] = await Promise.all([
        getRoles(authorization),
        getAccounts(authorization, {
          page: 0,
          size: 20,
          sortBy: "createdAt",
        }),
      ]);

      setRoles(roleRows);
      setAccounts(accountRows);
      setStatusDraftByAccountId(buildStatusDraftMap(accountRows.rows));
      setSuccessMessage(`Da tai ${accountRows.rows.length} tai khoan.`);
    });
  }, [authorization, runAction]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const loadRolesAndAccounts = useCallback(async () => {
    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    await runAction(async () => {
      const [roleRows, accountRows] = await Promise.all([
        getRoles(authorization),
        getAccounts(authorization, resolveAccountFilters()),
      ]);

      setRoles(roleRows);
      setAccounts(accountRows);
      setStatusDraftByAccountId(buildStatusDraftMap(accountRows.rows));
      setSuccessMessage(`Da tai ${accountRows.rows.length} tai khoan.`);
    });
  }, [authorization, resolveAccountFilters, runAction]);

  const roleOptions = useMemo(() => {
    return roles.map((role) => ({
      id: role.id,
      name: role.roleName || `Role ${role.id}`,
    }));
  }, [roles]);

  const openCreateModal = () => {
    setErrorMessage("");
    setAccountModalMode("create");
    setAccountForm({
      id: null,
      username: "",
      password: "",
      confirmPassword: "",
      roleId: roleOptions[0] ? String(roleOptions[0].id) : "",
      avatarUrl: "",
      desiredStatus: "ACTIVE",
    });
    setIsAccountModalOpen(true);
  };

  const openEditModal = async (accountId: number) => {
    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    await runAction(async () => {
      const account = await getAccountById(accountId, authorization);
      setAccountModalMode("edit");
      setAccountForm({
        id: account.id,
        username: account.username || "",
        password: "",
        confirmPassword: "",
        roleId: account.roleId ? String(account.roleId) : "",
        avatarUrl: account.avatarUrl || "",
        desiredStatus: isAccountStatus(account.status) ? account.status : "ACTIVE",
      });
      setIsAccountModalOpen(true);
    });
  };

  const closeAccountModal = () => {
    if (isLoading) {
      return;
    }

    setIsAccountModalOpen(false);
  };

  const handleSubmitFilters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadRolesAndAccounts();
  };

  const handleClearFilters = async () => {
    setKeywordFilter("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");

    if (!authorization) {
      return;
    }

    await runAction(async () => {
      const rows = await getAccounts(authorization, {
        page: 0,
        size: 20,
        sortBy: "createdAt",
      });

      setAccounts(rows);
      setStatusDraftByAccountId(buildStatusDraftMap(rows.rows));
      setSuccessMessage(`Da tai ${rows.rows.length} tai khoan.`);
    });
  };

  const handleSubmitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    const username = accountForm.username.trim();
    const roleId = parseRoleId(accountForm.roleId);
    const avatarUrl = accountForm.avatarUrl.trim();

    if (!username || !roleId) {
      setErrorMessage("Vui long nhap username va role hop le.");
      return;
    }

    if (accountModalMode === "create") {
      if (!accountForm.password || !accountForm.confirmPassword) {
        setErrorMessage("Vui long nhap password va xac nhan password.");
        return;
      }

      if (accountForm.password.length < 6) {
        setErrorMessage("Password toi thieu 6 ky tu.");
        return;
      }

      if (accountForm.password !== accountForm.confirmPassword) {
        setErrorMessage("Password va xac nhan password khong khop.");
        return;
      }
    }

    await runAction(async () => {
      if (accountModalMode === "create") {
        const created = await createAccount(
          {
            username,
            password: accountForm.password,
            roleId,
            avatarUrl: avatarUrl || undefined,
          },
          authorization,
        );

        if (
          created.id &&
          isAccountStatus(accountForm.desiredStatus) &&
          created.status !== accountForm.desiredStatus
        ) {
          await updateAccountStatus(created.id, accountForm.desiredStatus, authorization);
        }

        setSuccessMessage(`Tao tai khoan thanh cong: ${created.username}.`);
      } else {
        if (!accountForm.id) {
          throw new Error("Khong tim thay ID tai khoan de cap nhat.");
        }

        const updated = await updateAccount(
          accountForm.id,
          {
            username,
            roleId,
            avatarUrl: avatarUrl || undefined,
          },
          authorization,
        );

        setSuccessMessage(`Cap nhat tai khoan thanh cong: ${updated.username}.`);
      }

      const refreshed = await getAccounts(authorization, resolveAccountFilters());
      setAccounts(refreshed);
      setStatusDraftByAccountId(buildStatusDraftMap(refreshed.rows));
      setIsAccountModalOpen(false);
    });
  };

  const handleSaveAccountStatus = async (account: AccountListItem) => {
    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    const nextStatus = statusDraftByAccountId[account.id];
    if (!nextStatus || nextStatus === account.status) {
      setSuccessMessage("Trang thai khong thay doi.");
      return;
    }

    await runAction(async () => {
      await updateAccountStatus(account.id, nextStatus, authorization);
      const refreshed = await getAccounts(authorization, resolveAccountFilters());
      setAccounts(refreshed);
      setStatusDraftByAccountId(buildStatusDraftMap(refreshed.rows));
      setSuccessMessage(`Da cap nhat trang thai tai khoan #${account.id}.`);
    });
  };

  const handleOpenResetPassword = (account: AccountListItem) => {
    setErrorMessage("");
    setResetTargetAccount(account);
    setResetPasswordForm({
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleCloseResetPassword = () => {
    if (isLoading) {
      return;
    }

    setResetTargetAccount(null);
  };

  const handleSubmitResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!authorization) {
      setErrorMessage("Khong tim thay token dang nhap. Vui long dang nhap lai.");
      return;
    }

    if (!resetTargetAccount?.id) {
      setErrorMessage("Khong tim thay tai khoan can reset password.");
      return;
    }

    const newPassword = resetPasswordForm.newPassword;
    const confirmPassword = resetPasswordForm.confirmPassword;

    if (!newPassword || !confirmPassword) {
      setErrorMessage("Vui long nhap day du mat khau moi va xac nhan.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Mat khau moi toi thieu 6 ky tu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Mat khau moi va xac nhan khong khop.");
      return;
    }

    await runAction(async () => {
      await resetAccountPassword(
        resetTargetAccount.id,
        {
          newPassword,
          confirmPassword,
        },
        authorization,
      );

      setResetTargetAccount(null);
      setSuccessMessage(`Da reset password cho tai khoan #${resetTargetAccount.id}.`);
    });
  };

  return (
    <section className="rounded-[8px] border border-[#8ab3d1] bg-white shadow-[0_1px_2px_rgba(7,51,84,0.16)]">
      <div className="flex items-center justify-between border-b border-[#c5dced] px-4 py-2 text-[18px] font-semibold text-[#1a4f75]">
        <h2>Quan ly tai khoan</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            disabled={isLoading}
            className="rounded-[4px] bg-[#0d6ea6] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
          >
            Tao tai khoan
          </button>
          <button
            type="button"
            onClick={() => {
              void loadRolesAndAccounts();
            }}
            disabled={isLoading}
            className="rounded-[4px] border border-[#9ec3dd] bg-white px-3 py-1.5 text-sm font-semibold text-[#165a83] transition hover:bg-[#edf6fd] disabled:opacity-60"
          >
            Lam moi
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <form className="grid gap-2 md:grid-cols-4" onSubmit={handleSubmitFilters}>
          <input
            className="h-10 rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
            placeholder="Tim theo username..."
            value={keywordFilter}
            onChange={(event) => setKeywordFilter(event.target.value)}
          />
          <select
            className="h-10 rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as FilterRoleValue)}
          >
            <option value="ALL">Tat ca role</option>
            {roleOptions.map((role) => (
              <option key={role.id} value={String(role.id)}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as FilterStatusValue)
            }
          >
            <option value="ALL">Tat ca trang thai</option>
            {accountStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="h-10 rounded-[6px] bg-[#0d6ea6] px-4 text-sm font-semibold text-white transition hover:bg-[#085d90] disabled:opacity-60"
            >
              Loc
            </button>
            <button
              type="button"
              onClick={() => {
                void handleClearFilters();
              }}
              disabled={isLoading}
              className="h-10 rounded-[6px] border border-[#9ec3dd] bg-white px-4 text-sm font-semibold text-[#245977] transition hover:bg-[#edf6fd] disabled:opacity-60"
            >
              Bo loc
            </button>
          </div>
        </form>

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
                <th className="px-2 py-2">Username</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Trang thai</th>
                <th className="px-2 py-2">Created at</th>
                <th className="px-2 py-2">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {accounts.rows.map((item) => {
                const currentStatus = isAccountStatus(item.status)
                  ? item.status
                  : "ACTIVE";
                const draftStatus = statusDraftByAccountId[item.id] || currentStatus;

                return (
                  <tr key={item.id} className="border-b border-[#e0ebf4] text-[#1f3344]">
                    <td className="px-2 py-2">{item.id}</td>
                    <td className="px-2 py-2">{item.username || "-"}</td>
                    <td className="px-2 py-2">{item.roleName || "-"}</td>
                    <td className="px-2 py-2">
                      <div className="flex min-w-[210px] items-center gap-2">
                        <select
                          className="h-9 w-[130px] rounded-[6px] border border-[#c8d3dd] px-2 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
                          value={draftStatus}
                          onChange={(event) =>
                            setStatusDraftByAccountId((prev) => ({
                              ...prev,
                              [item.id]: event.target.value as AccountStatus,
                            }))
                          }
                        >
                          {accountStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            void handleSaveAccountStatus(item);
                          }}
                          disabled={isLoading}
                          className="h-9 rounded-[6px] border border-[#9ec3dd] bg-white px-2.5 text-xs font-semibold text-[#245977] transition hover:bg-[#edf6fd] disabled:opacity-60"
                        >
                          Luu
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2">{formatDateTime(item.createdAt)}</td>
                    <td className="px-2 py-2">
                      <div className="flex min-w-[220px] items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void openEditModal(item.id);
                          }}
                          className="h-9 rounded-[6px] border border-[#9ec3dd] bg-white px-3 text-xs font-semibold text-[#245977] transition hover:bg-[#edf6fd]"
                          disabled={isLoading}
                        >
                          Sua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenResetPassword(item)}
                          className="h-9 rounded-[6px] bg-[#0d6ea6] px-3 text-xs font-semibold text-white transition hover:bg-[#085d90]"
                          disabled={isLoading}
                        >
                          Reset MK
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {accounts.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-[#577086]">
                    Chua co du lieu tai khoan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {isAccountModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08273f]/55 px-3 py-6 backdrop-blur-[1px]"
          onClick={closeAccountModal}
        >
          <div
            className="w-full max-w-[640px] rounded-[14px] border border-[#8db7d5] bg-white shadow-[0_18px_60px_rgba(7,35,62,0.36)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#d2e4f1] px-5 py-3">
              <h3 className="text-[20px] font-semibold text-[#154f75]">
                {accountModalMode === "create"
                  ? "Tao Tai Khoan Moi"
                  : `Cap Nhat Tai Khoan #${accountForm.id}`}
              </h3>
              <button
                type="button"
                onClick={closeAccountModal}
                className="rounded-full border border-[#bdd5e7] px-2 py-0.5 text-xl leading-none text-[#346180] transition hover:bg-[#edf6fd]"
                disabled={isLoading}
                aria-label="Dong popup"
              >
                ×
              </button>
            </div>

            <form className="grid gap-3 px-5 py-4 md:grid-cols-2" onSubmit={handleSubmitAccount}>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-semibold text-[#2c5877]">Username</span>
                <input
                  className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] placeholder:text-[#5f6b76] outline-none focus:border-[#6aa8cf]"
                  placeholder="Nhap username"
                  value={accountForm.username}
                  onChange={(event) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-semibold text-[#2c5877]">Role</span>
                <select
                  className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
                  value={accountForm.roleId}
                  onChange={(event) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      roleId: event.target.value,
                    }))
                  }
                >
                  <option value="">Chon role</option>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={String(role.id)}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm font-semibold text-[#2c5877]">
                  Avatar URL (khong bat buoc)
                </span>
                <input
                  className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] placeholder:text-[#5f6b76] outline-none focus:border-[#6aa8cf]"
                  placeholder="https://..."
                  value={accountForm.avatarUrl}
                  onChange={(event) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      avatarUrl: event.target.value,
                    }))
                  }
                />
              </label>

              {accountModalMode === "create" ? (
                <>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-[#2c5877]">Password</span>
                    <input
                      type="password"
                      className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] placeholder:text-[#5f6b76] outline-none focus:border-[#6aa8cf]"
                      placeholder="Toi thieu 6 ky tu"
                      value={accountForm.password}
                      onChange={(event) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-[#2c5877]">
                      Xac nhan password
                    </span>
                    <input
                      type="password"
                      className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] placeholder:text-[#5f6b76] outline-none focus:border-[#6aa8cf]"
                      placeholder="Nhap lai password"
                      value={accountForm.confirmPassword}
                      onChange={(event) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-semibold text-[#2c5877]">
                      Trang thai sau khi tao
                    </span>
                    <select
                      className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] outline-none focus:border-[#6aa8cf]"
                      value={accountForm.desiredStatus}
                      onChange={(event) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          desiredStatus: event.target.value as AccountStatus,
                        }))
                      }
                    >
                      {accountStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              <div className="mt-1 flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={closeAccountModal}
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
                    : accountModalMode === "create"
                      ? "Tao tai khoan"
                      : "Luu thay doi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resetTargetAccount ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08273f]/55 px-3 py-6 backdrop-blur-[1px]"
          onClick={handleCloseResetPassword}
        >
          <div
            className="w-full max-w-[520px] rounded-[14px] border border-[#8db7d5] bg-white shadow-[0_18px_60px_rgba(7,35,62,0.36)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#d2e4f1] px-5 py-3">
              <h3 className="text-[20px] font-semibold text-[#154f75]">
                Reset Password Tai Khoan #{resetTargetAccount.id}
              </h3>
              <button
                type="button"
                onClick={handleCloseResetPassword}
                className="rounded-full border border-[#bdd5e7] px-2 py-0.5 text-xl leading-none text-[#346180] transition hover:bg-[#edf6fd]"
                disabled={isLoading}
                aria-label="Dong popup"
              >
                ×
              </button>
            </div>

            <form className="space-y-3 px-5 py-4" onSubmit={handleSubmitResetPassword}>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-[#2c5877]">Mat khau moi</span>
                <input
                  type="password"
                  className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] placeholder:text-[#5f6b76] outline-none focus:border-[#6aa8cf]"
                  placeholder="Toi thieu 6 ky tu"
                  value={resetPasswordForm.newPassword}
                  onChange={(event) =>
                    setResetPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-semibold text-[#2c5877]">
                  Xac nhan mat khau moi
                </span>
                <input
                  type="password"
                  className="h-10 w-full rounded-[6px] border border-[#c8d3dd] px-3 text-sm text-[#111827] placeholder:text-[#5f6b76] outline-none focus:border-[#6aa8cf]"
                  placeholder="Nhap lai mat khau moi"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(event) =>
                    setResetPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseResetPassword}
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
                  {isLoading ? "Dang xu ly..." : "Xac nhan reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};
