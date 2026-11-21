import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bug, Users, Pencil } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import API from "../services/api";
import MembersPanel from "../components/MembersPanel";
import IssueModal from "../components/IssueModal";

function Kanban() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [board, setBoard] = useState({
    "To Do": [],
    "In Progress": [],
    "Done": [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [showMembers, setShowMembers] = useState(false);
  const [myRole, setMyRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [editingIssue, setEditingIssue] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await API.get("/projects/");
        setProjects(response.data);

        if (response.data.length > 0) {
          setProjectId(String(response.data[0].id));
        }
      } catch {
        setError("Unable to load projects.");
      }
    };

    fetchProjects();
  }, []);

  const fetchComments = async (issueId) => {
    try {
      const response = await API.get(
        `/issues/${issueId}/comments`
      );

      setComments((prev) => ({
        ...prev,
        [issueId]: response.data,
      }));
    } catch {
      setError("Unable to load comments.");
    }
  };

  const loadBoard = async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");

    try {
      const response = await API.get(
        `/issues/board/${projectId}`
      );
      setBoard(response.data);
      Object.values(response.data).flat().forEach((issue) => {
        fetchComments(issue.id);
      });
    } catch {
      setError("Unable to load Kanban board.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    API.get(`/projects/${projectId}/my-role`)
      .then((res) => {
        setMyRole(res.data.role);
        setMyUserId(res.data.user_id);
      })
      .catch(() => {
        setMyRole(null);
        setMyUserId(null);
      });

    API.get(`/projects/${projectId}/members`)
      .then((res) => setMembers(res.data))
      .catch(() => setMembers([]));
  }, [projectId]);

  const handleStatusChange = async (issueOrDraggableId, newStatus) => {
    setError("");
    let issue = issueOrDraggableId;

    if (typeof issueOrDraggableId === "string") {
      const issueId = Number(issueOrDraggableId.replace("issue-", ""));

      issue = Object.values(board)
        .flat()
        .find((item) => item.id === issueId);
    }

    if (!issue || issue.status === newStatus) return;

    const previousBoard = board;
    const updatedIssue = { ...issue, status: newStatus };

    setBoard((prev) => ({
      ...prev,
      [issue.status]: (prev[issue.status] || []).filter(
        (item) => item.id !== issue.id
      ),
      [newStatus]: [
        ...(prev[newStatus] || []),
        updatedIssue,
      ],
    }));

    try {
      const response = await API.patch(`/issues/${issue.id}/status`, {
        status: newStatus,
      });

      setBoard((prev) => ({
        ...prev,
        [newStatus]: (prev[newStatus] || []).map((item) =>
          item.id === issue.id ? response.data : item
        ),
      }));
    } catch (err) {
      setBoard(previousBoard);
      setError(
        err.response?.data?.detail ||
        "Unable to update issue status."
      );
    }
  };

  const handleAddComment = async (issueId) => {
    const content = commentInputs[issueId]?.trim();

    if (!content) return;

    try {
      const response = await API.post(
        `/issues/${issueId}/comments`,
        { content }
      );

      setComments((prev) => ({
        ...prev,
        [issueId]: [
          ...(prev[issueId] || []),
          response.data,
        ],
      }));

      setCommentInputs((prev) => ({
        ...prev,
        [issueId]: "",
      }));
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to add comment."
      );
    }
  };

  const columns = [
    { key: "todo", title: "To Do" },
    { key: "in_progress", title: "In Progress" },
    { key: "done", title: "Done" },
  ];

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const statusByKey = {
      todo: "To Do",
      in_progress: "In Progress",
      done: "Done",
    };

    handleStatusChange(draggableId, statusByKey[destination.droppableId]);
  };

  const canEditIssue = (issue) => {
    if (myRole === "Admin") return true;
    if (myRole === "Developer") {
      return issue.created_by === myUserId || issue.assigned_to === myUserId;
    }
    return false;
  };

  const assigneeName = (issue) =>
    members.find((member) => member.user_id === issue.assigned_to)?.name || "Unassigned";

  return (
    <div className="min-h-screen bg-slate-100">

      <header className="bg-white border-b p-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Bug className="text-blue-600" size={28} />
          <h1 className="text-xl font-bold">Bug Tracker</h1>
        </div>

        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-blue-600"
        >
          <ArrowLeft size={18} />
          Dashboard
        </Link>
      </header>

      <main className="max-w-7xl mx-auto p-6">

        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">
              Kanban Board
            </h2>
            <p className="text-slate-500 mt-2">
              Track your issues across different stages.
            </p>
          </div>

          <div className="flex gap-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="border rounded-lg p-3 bg-white"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {projectId && (
              <button
                onClick={() => setShowMembers(true)}
                className="flex items-center gap-2 border rounded-lg px-4 bg-white hover:bg-slate-50"
              >
                <Users size={18} /> Members
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="bg-red-50 text-red-600 p-3 rounded-lg mb-5">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-slate-500">Loading board...</p>
        ) : !projectId ? (
          <p className="bg-white p-6 rounded-xl">
            Create a project first to view its Kanban board.
          </p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((column) => {
                const statusKey = {
                  todo: "To Do",
                  in_progress: "In Progress",
                  done: "Done",
                }[column.key];
                const columnIssues = board[statusKey] || [];

                return (
                  <Droppable droppableId={column.key} key={column.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-xl p-4 min-h-[300px] transition ${
                          snapshot.isDraggingOver ? "bg-blue-50" : "bg-slate-200"
                        }`}
                      >
                        <h3 className="font-semibold text-slate-700 mb-4">
                          {column.title}{" "}
                          <span className="text-slate-400">
                            {columnIssues.length}
                          </span>
                        </h3>

                        {columnIssues.map((issue, index) => (
                          <Draggable
                            key={issue.id}
                            draggableId={String(issue.id)}
                            index={index}
                            isDragDisabled={myRole === "Viewer"}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <article
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`bg-white rounded-lg p-4 mb-3 shadow ${
                                  dragSnapshot.isDragging ? "shadow-xl" : ""
                                }`}
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="text-xs text-slate-400">
                                    ISSUE #{issue.id}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setEditingIssue(issue)}
                                    className="text-slate-400 hover:text-blue-600"
                                    title={canEditIssue(issue) ? "Edit issue" : "View issue"}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </div>

                                <h4 className="font-semibold text-slate-800">
                                  {issue.title}
                                </h4>

                                <p className="text-sm text-slate-500 mt-2">
                                  {issue.description}
                                </p>

                                <div className="flex gap-2 mt-4 flex-wrap">
                                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                                    {issue.issue_type}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      {
                                        Critical: "bg-red-100 text-red-700",
                                        High: "bg-orange-100 text-orange-700",
                                        Medium: "bg-yellow-100 text-yellow-700",
                                        Low: "bg-green-100 text-green-700",
                                      }[issue.priority] || "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {issue.priority}
                                  </span>
                                </div>

                                <p className="mt-3 text-xs text-slate-500">
                                  Assignee: <span className="font-medium">{assigneeName(issue)}</span>
                                </p>

                                <div className="mt-4">
                                  <label className="block text-xs font-medium text-slate-500 mb-2">
                                    Update Status
                                  </label>
                                  <select
                                    value={issue.status}
                                    onChange={(e) =>
                                      handleStatusChange(issue, e.target.value)
                                    }
                                    className="w-full border rounded-lg p-2 text-sm bg-white"
                                  >
                                    <option value="To Do">To Do</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Done">Done</option>
                                  </select>
                                </div>

                                <div className="mt-4 border-t pt-4">
                                  <button
                                    onClick={() => fetchComments(issue.id)}
                                    className="text-blue-600 text-sm font-semibold hover:underline"
                                  >
                                    View Comments
                                  </button>

                                  {(comments[issue.id] || []).map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="bg-slate-50 p-3 rounded-lg mt-3"
                                    >
                                      <p className="text-sm text-slate-700">
                                        {comment.content}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        User ID: {comment.user_id}
                                      </p>
                                    </div>
                                  ))}

                                  <div className="flex gap-2 mt-3">
                                    <input
                                      type="text"
                                      value={commentInputs[issue.id] || ""}
                                      onChange={(e) =>
                                        setCommentInputs((prev) => ({
                                          ...prev,
                                          [issue.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Write a comment..."
                                      className="min-w-0 flex-1 border rounded-lg p-2 text-sm"
                                    />
                                    <button
                                      onClick={() => handleAddComment(issue.id)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
                                    >
                                      Send
                                    </button>
                                  </div>
                                </div>
                              </article>
                            )}
                          </Draggable>
                        ))}

                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </main>

      {showMembers && (
        <MembersPanel
          projectId={projectId}
          myRole={myRole}
          onClose={() => setShowMembers(false)}
        />
      )}

      {editingIssue && (
        <IssueModal
          issue={editingIssue}
          members={members}
          myRole={myRole}
          canEdit={canEditIssue(editingIssue)}
          onClose={() => setEditingIssue(null)}
          onSaved={() => {
            setEditingIssue(null);
            loadBoard();
          }}
        />
      )}
    </div>
  );
}

export default Kanban;
