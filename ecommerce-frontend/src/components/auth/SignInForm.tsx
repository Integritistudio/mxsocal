"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/services/auth";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { isValidEmail } from "@/utils/helpers";
import axios, { AxiosError } from "axios";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
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
          Object.keys(permissionMap)?.map((key: string) => {
            if (response.user?.permissions?.includes(key)) {
              router.push(permissionMap[key])
              return;
            }
          })
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

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Admin Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in to the MxSocal admin panel.
            </p>
          </div>
          <div>
            <form noValidate onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input name="email" placeholder="info@gmail.com" defaultValue={formData.email} type="email" onChange={handleChange} error={!!formErrors?.email} hint={formErrors?.email} />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      defaultValue={formData.password}
                      onChange={handleChange}
                      error={!!formErrors?.password}
                      hint={formErrors?.password}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <Button className="w-full" size="sm">
                    Sign in
                  </Button>
                </div>
              </div>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
}
