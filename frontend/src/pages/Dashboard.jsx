import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bug,
  FolderKanban,
  CircleCheck,
  Clock,
  LogOut,
  LayoutDashboard,
  ListTodo
} from "lucide-react";

import API from "../services/api";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [members, setMembers] = useState([]);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [issueForm, setIssueForm] = useState({
    title: "",
    description: "",
    issue_type: "Bug",
    status: "To Do",
    priority: "Medium",
    project_id: "",
    assigned_to: "",
  });
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/");
        return;
      }

      try {
        const userResponse = await API.get("/users/me");
        setUser(userResponse.data);

        const projectResponse = await API.get("/projects/");
        setProjects(projectResponse.data);

        const issueResponses = await Promise.all(
          projectResponse.data.map((project) =>
            API.get("/issues/", {
              params: { project_id: project.id, limit: 100 }
            })
          )
        );

        setIssues(issueResponses.flatMap((response) => response.data));

      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
        } else {
          setError("Unable to load dashboard. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);


const handleCreateProject = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");

  try {
    const response = await API.post("/projects/", {
      name: projectName,
      description: projectDescription,
    });

    setProjects((prev) => [...prev, response.data]);

    setProjectName("");
    setProjectDescription("");
    setShowForm(false);

    setSuccess("Project created successfully!");
  } catch (err) {
    setError(
      err.response?.data?.detail || "Unable to create project."
    );
  }
};

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await API.post("/issues/", {
        ...issueForm,
        project_id: Number(issueForm.project_id),
        assigned_to: issueForm.assigned_to ? Number(issueForm.assigned_to) : null,
      });

      setIssues((prev) => [response.data, ...prev]);
      setIssueForm({
        title: "",
        description: "",
        issue_type: "Bug",
        status: "To Do",
        priority: "Medium",
        project_id: projects[0]?.id ? String(projects[0].id) : "",
        assigned_to: "",
      });
      setShowIssueForm(false);
      setSuccess("Issue created successfully!");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create issue.");
    }
  };


  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const openIssues = issues.filter(
    (issue) => issue.status !== "Done"
  ).length;

  const completedIssues = issues.filter(
    (issue) => issue.status === "Done"
  ).length;

  const stats = [
    {
      title: "Total Projects",
      value: projects.length,
      icon: FolderKanban,
      color: "text-blue-600",
      bg: "bg-blue-100"
    },
    {
      title: "Total Issues",
      value: issues.length,
      icon: Bug,
      color: "text-purple-600",
      bg: "bg-purple-100"
    },
    {
      title: "Open Issues",
      value: openIssues,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-100"
    },
    {
      title: "Completed",
      value: completedIssues,
      icon: CircleCheck,
      color: "text-green-600",
      bg: "bg-green-100"
    }
  ];

  useEffect(() => {
    if (!issueForm.project_id) {
      setMembers([]);
      return;
    }

    API.get(`/projects/${issueForm.project_id}/members`)
      .then((response) => setMembers(response.data))
      .catch(() => setMembers([]));
  }, [issueForm.project_id]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">

      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Bug color="white" size={25} />
          </div>

          <h1 className="text-xl font-bold text-slate-800">
            Bug Tracker
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/kanban")}
            className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg"
          >
            <LayoutDashboard size={18} />
            Kanban Board
          </button>

          <span className="text-slate-600 text-sm">
            Welcome, {user?.name}
          </span>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">

        
<div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div>
    <h2 className="text-3xl font-bold text-slate-800">
      Dashboard
    </h2>

    <p className="text-slate-500 mt-2">
      Overview of your projects and issue tracking activity.
    </p>
  </div>

  <div className="flex gap-3">
    <button
      onClick={() => setShowForm(!showForm)}
      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold"
    >
      + Create Project
    </button>

    <button
      onClick={() => setShowIssueForm(!showIssueForm)}
      disabled={projects.length === 0}
      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-lg font-semibold disabled:opacity-50"
    >
      + Create Issue
    </button>
  </div>
</div>

{success && (
  <p className="text-green-700 bg-green-50 p-3 rounded-lg mb-5">
    {success}
  </p>
)}

{showForm && (
  <form
    onSubmit={handleCreateProject}
    className="bg-white rounded-xl border shadow-sm p-6 mb-8 space-y-4"
  >
    <h3 className="text-xl font-bold text-slate-800">
      Create New Project
    </h3>

    <div>
      <label className="block text-sm font-medium mb-2">
        Project Name
      </label>

      <input
        type="text"
        required
        maxLength={150}
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Enter project name"
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">
        Description
      </label>

      <textarea
        value={projectDescription}
        onChange={(e) => setProjectDescription(e.target.value)}
        placeholder="Describe your project"
        rows="3"
        maxLength={500}
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div className="flex gap-3">
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
      >
        Save Project
      </button>

      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="bg-slate-200 hover:bg-slate-300 px-5 py-2 rounded-lg"
      >
        Cancel
      </button>
    </div>
  </form>
)}

{showIssueForm && (
  <form
    onSubmit={handleCreateIssue}
    className="bg-white rounded-xl border shadow-sm p-6 mb-8 space-y-4"
  >
    <h3 className="text-xl font-bold text-slate-800">
      Create New Issue
    </h3>

    <div>
      <label className="block text-sm font-medium mb-2">
        Issue Title
      </label>
      <input
        type="text"
        required
        maxLength={200}
        value={issueForm.title}
        onChange={(e) =>
          setIssueForm({ ...issueForm, title: e.target.value })
        }
        placeholder="Enter issue title"
        className="w-full border rounded-lg p-3"
      />
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">
        Description
      </label>
      <textarea
        value={issueForm.description}
        onChange={(e) =>
          setIssueForm({ ...issueForm, description: e.target.value })
        }
        placeholder="Describe the issue"
        rows="3"
        className="w-full border rounded-lg p-3"
      />
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">
        Project
      </label>
      <select
        required
        value={issueForm.project_id}
        onChange={(e) =>
          setIssueForm({ ...issueForm, project_id: e.target.value })
        }
        className="w-full border rounded-lg p-3"
      >
        <option value="">Select a project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Type
        </label>
        <select
          value={issueForm.issue_type}
          onChange={(e) =>
            setIssueForm({ ...issueForm, issue_type: e.target.value })
          }
          className="w-full border rounded-lg p-3"
        >
          <option value="Bug">Bug</option>
          <option value="Task">Task</option>
          <option value="Feature">Feature</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Priority
        </label>
        <select
          value={issueForm.priority}
          onChange={(e) =>
            setIssueForm({ ...issueForm, priority: e.target.value })
          }
          className="w-full border rounded-lg p-3"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Status
        </label>
        <select
          value={issueForm.status}
          onChange={(e) =>
            setIssueForm({ ...issueForm, status: e.target.value })
          }
          className="w-full border rounded-lg p-3"
        >
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">
        Assignee
      </label>
      <select
        name="assigned_to"
        value={issueForm.assigned_to || ""}
        onChange={(e) =>
          setIssueForm({ ...issueForm, assigned_to: e.target.value })
        }
        className="w-full border rounded-lg p-3"
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.name}
          </option>
        ))}
      </select>
    </div>

    <div className="flex gap-3">
      <button
        type="submit"
        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
      >
        Save Issue
      </button>

      <button
        type="button"
        onClick={() => setShowIssueForm(false)}
        className="bg-slate-200 hover:bg-slate-300 px-5 py-2 rounded-lg"
      >
        Cancel
      </button>
    </div>
  </form>
)}


        {error && (
          <p className="text-red-600 bg-red-50 p-3 rounded-lg mb-5">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
              >
                <div className="flex justify-between items-center">

                  <div>
                    <p className="text-slate-500 text-sm">
                      {stat.title}
                    </p>

                    <h3 className="text-3xl font-bold mt-2 text-slate-800">
                      {stat.value}
                    </h3>
                  </div>

                  <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                    <Icon size={25} />
                  </div>

                </div>
              </div>
            );
          })}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

          <section className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-5">
              <FolderKanban className="text-blue-600" />
              <h3 className="text-lg font-bold">
                My Projects
              </h3>
            </div>

            {projects.length === 0 ? (
              <p className="text-slate-500">
                No projects found.
              </p>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="border-b last:border-0 py-4"
                >
                  <h4 className="font-semibold text-slate-800">
                    {project.name}
                  </h4>

                  <p className="text-sm text-slate-500 mt-1">
                    {project.description || "No description"}
                  </p>
                </div>
              ))
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-5">
              <ListTodo className="text-purple-600" />
              <h3 className="text-lg font-bold">
                Recent Issues
              </h3>
            </div>

            {issues.length === 0 ? (
              <p className="text-slate-500">
                No issues found.
              </p>
            ) : (
              issues.slice(0, 5).map((issue) => (
                <div
                  key={issue.id}
                  className="border-b last:border-0 py-4"
                >
                  <h4 className="font-semibold text-slate-800">
                    {issue.title}
                  </h4>

                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {issue.status}
                    </span>

                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      {issue.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </section>

        </div>

      </main>
    </div>
  );
}

export default Dashboard;
