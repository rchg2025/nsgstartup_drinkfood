"use client";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Tên đăng nhập hoặc mật khẩu không đúng");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
      </div>

      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🧋</span>
          <div>
            <h1 className={styles.logoTitle}>NSG STARTUP</h1>
            <p className={styles.logoSub}>Hệ thống bán hàng</p>
          </div>
        </div>

        <h2 className={styles.title}>Chào mừng trở lại!</h2>
        <p className={styles.subtitle}>Đăng nhập để tiếp tục</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>
            <input
              id="email"
              type="text"
              className="form-input"
              placeholder="Ví dụ: admin@nsg.vn hoặc admin_nsg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className={styles.error}>
              <span>⚠️</span> {error}
            </div>
          )}
          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="loading-spinner" />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập →"
            )}
          </button>
        </form>


      </div>
    </div>
  );
}
