

import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function Page() {  
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#e0eafc,#cfdef3)" }}>
      <Suspense fallback={<div>Đang tải...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
