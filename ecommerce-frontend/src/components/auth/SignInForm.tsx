"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/services/auth";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { isValidEmail } from "@/utils/helpers";
import axios from "axios";
import s from "@/layout/admin-theme.module.css";

import { EyeCloseIcon, EyeIcon } from "@/icons";

type FormData = {
  email: string;
  password: string;
};

const validatateForm = (data: FormData) => {
  const errors: Record<string, string> = {};
  if (!data.email) {
    errors.email = "Email is required";
  } else if (!isValidEmail(data.email)) {
    errors.email = "Invalid email format";
  }
  if (!data.password) {
    errors.password = "Password is required";
  }
  return errors;
}


const permissionMap: Record<string, string> = {
  "dashboard:view": "/dashboard",
  "booking:view": "/bookings",
  "product:view": "/products",
  "coach:view": "/dashboard/coaches",
};


export default function SignInForm() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { login } = useUser();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    setFormErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const errors = validatateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      setLoading(true);
      const response = await signIn(formData.email, formData.password);
      if (response) {
        login(response.user);
        showAlert("success", "Signed in successfully!", "Success");
        if (response.user.role === "admin") {
          router.push("/dashboard");
        } else if (response.user.role === "manager") {
          const destination = Object.keys(permissionMap).find(key => response.user?.permissions?.includes(key));
          router.push(destination ? permissionMap[destination] : "/profile");
        }
      } else {
        showAlert("error", "Failed to sign in. Please check your credentials and try again.", "Sign In Error");
      }
    } catch (error: unknown) {
      let message = "Failed to sign in. Please check your credentials and try again.";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }

      showAlert("error", message, "Sign In Error");
    }
    finally {
      setLoading(false);
    }

  };

  return <div className={s.signin}><h1>Admin sign in</h1><p>Sign in with your staff account.</p><form noValidate onSubmit={handleSubmit}>
    <label htmlFor="admin-email">Email address<input id="admin-email" name="email" type="email" autoComplete="username" value={formData.email} onChange={handleChange} placeholder="you@example.com" required aria-invalid={!!formErrors.email} aria-describedby={formErrors.email ? "email-error" : undefined} />{formErrors.email && <small id="email-error" role="alert">{formErrors.email}</small>}</label>
    <label htmlFor="admin-password">Password<div className={s.password}><input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required aria-invalid={!!formErrors.password} aria-describedby={formErrors.password ? "password-error" : undefined} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeIcon /> : <EyeCloseIcon />}</button></div>{formErrors.password && <small id="password-error" role="alert">{formErrors.password}</small>}</label>
    <button className={s.loginButton} type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
  </form></div>;
}
