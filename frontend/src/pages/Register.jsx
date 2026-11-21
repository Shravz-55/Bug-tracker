
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { Bug, User, Mail, Lock } from "lucide-react";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await API.post("/users/register", form);

      alert("Registration successful! Please log in.");
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-xl">
            <Bug size={32} color="white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-slate-800">
          Create Account
        </h1>

        <p className="text-center text-slate-500 mt-2 mb-8">
          Join Bug Tracker and manage your projects
        </p>

        <form onSubmit={handleRegister} className="space-y-5">

          <div>
            <label className="block text-sm font-medium mb-2">
              Full Name
            </label>

            <div className="flex items-center border rounded-lg px-3">
              <User size={18} className="text-slate-400" />

              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your name"
                className="w-full p-3 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address
            </label>

            <div className="flex items-center border rounded-lg px-3">
              <Mail size={18} className="text-slate-400" />

              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full p-3 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>

            <div className="flex items-center border rounded-lg px-3">
              <Lock size={18} className="text-slate-400" />

              <input
                type="password"
                name="password"
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password (8+ characters)"
                className="w-full p-3 outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>

        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            to="/"
            className="text-blue-600 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Register;
