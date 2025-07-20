import React from "react";

type AccountTabProps = {
  user: {
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  loading?: boolean;
};

export default function AccountTab({ user, loading }: AccountTabProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-6">Thông tin tài khoản</h2>
      {loading ? (
        <div className="text-gray-400">Đang tải thông tin...</div>
      ) : user ? (
        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-xs flex flex-col gap-2">
          <div><span className="font-semibold">Email:</span> {user.email}</div>
          <div><span className="font-semibold">Tên:</span> {user.firstName} {user.lastName}</div>
        </div>
      ) : (
        <div className="text-gray-400">Không có thông tin tài khoản.</div>
      )}
    </div>
  );
}
