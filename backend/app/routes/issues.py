from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.core.security import get_current_user
from app.permissions import require_role, get_project_role

router = APIRouter(
    prefix="/issues",
    tags=["Issues"]
)


@router.post("/", response_model=schemas.IssueResponse)
def create_issue(
    issue: schemas.IssueCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    require_role(db, current_user, issue.project_id, "Developer")

    # Check whether the project exists and belongs to the user
    project = db.query(models.Project).filter(
        models.Project.id == issue.project_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # Check whether the assigned user exists
    if issue.assigned_to is not None:
        assigned_user = db.query(models.User).filter(
            models.User.id == issue.assigned_to,
            models.User.is_active == True
        ).first()

        if not assigned_user:
            raise HTTPException(
                status_code=404,
                detail="Assigned user not found or inactive"
            )

        if get_project_role(db, assigned_user, issue.project_id) is None:
            raise HTTPException(
                status_code=400,
                detail="Assignee is not a member of this project"
            )

    new_issue = models.Issue(
        title=issue.title,
        description=issue.description,
        issue_type=issue.issue_type,
        status=issue.status,
        priority=issue.priority,
        project_id=issue.project_id,
        assigned_to=issue.assigned_to,
        created_by=current_user.id
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return new_issue


@router.get("/", response_model=list[schemas.IssueResponse])
def get_issues(
    project_id: int,
    search: str | None = Query(default=None, min_length=1),
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    issue_type: str | None = Query(default=None),
    assigned_to: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    require_role(db, current_user, project_id, "Viewer")

    project = db.query(models.Project).filter(
        models.Project.id == project_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    query = db.query(models.Issue).filter(
        models.Issue.project_id == project_id
    )

    if search:
        query = query.filter(
            models.Issue.title.ilike(f"%{search}%")
        )

    if status:
        query = query.filter(
            models.Issue.status == status
        )

    if priority:
        query = query.filter(
            models.Issue.priority == priority
        )

    if issue_type:
        query = query.filter(
            models.Issue.issue_type == issue_type
        )

    if assigned_to is not None:
        query = query.filter(
            models.Issue.assigned_to == assigned_to
        )

    # return query.order_by(models.Issue.id.desc()).all()
    return query.order_by(
    models.Issue.id.desc()
).offset(skip).limit(limit).all()


@router.get("/{issue_id}", response_model=schemas.IssueResponse)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    require_role(db, current_user, issue.project_id, "Viewer")
    return issue


@router.put("/{issue_id}", response_model=schemas.IssueResponse)
def update_issue(
    issue_id: int,
    issue_data: schemas.IssueCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = db.query(models.Issue).filter(
        models.Issue.id == issue_id
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    role = require_role(db, current_user, issue.project_id, "Developer")

    if role == "Developer" and current_user.id not in (
        issue.created_by,
        issue.assigned_to,
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own or assigned issues",
        )

    if issue_data.project_id != issue.project_id:
        raise HTTPException(
            status_code=400,
            detail="Moving issues between projects is not allowed"
        )

    # Check whether the assigned user exists and belongs to this project
    if issue_data.assigned_to is not None:
        assigned_user = db.query(models.User).filter(
            models.User.id == issue_data.assigned_to,
            models.User.is_active == True
        ).first()

        if not assigned_user:
            raise HTTPException(
                status_code=404,
                detail="Assigned user not found or inactive"
            )

        if get_project_role(db, assigned_user, issue.project_id) is None:
            raise HTTPException(
                status_code=400,
                detail="Assignee is not a member of this project"
            )

    issue.title = issue_data.title
    issue.description = issue_data.description
    issue.issue_type = issue_data.issue_type
    issue.status = issue_data.status
    issue.priority = issue_data.priority
    issue.assigned_to = issue_data.assigned_to

    db.commit()
    db.refresh(issue)

    return issue


@router.delete("/{issue_id}")
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = db.query(models.Issue).filter(
        models.Issue.id == issue_id
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    require_role(db, current_user, issue.project_id, "Admin")

    db.query(models.Comment).filter(
        models.Comment.issue_id == issue_id
    ).delete(synchronize_session=False)

    db.delete(issue)
    db.commit()

    return {
        "message": "Issue deleted successfully"
    }


@router.get("/board/{project_id}")
def get_kanban_board(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    require_role(db, current_user, project_id, "Viewer")

    project = db.query(models.Project).filter(
        models.Project.id == project_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    statuses = ["To Do", "In Progress", "Done"]

    board = {}

    for status in statuses:
        board[status] = db.query(models.Issue).filter(
            models.Issue.project_id == project_id,
            models.Issue.status == status
        ).all()

    return board


@router.patch("/{issue_id}/status", response_model=schemas.IssueResponse)
def update_issue_status(
    issue_id: int,
    data: schemas.IssueStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = db.query(models.Issue).filter(models.Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    role = require_role(db, current_user, issue.project_id, "Developer")

    if role == "Developer" and current_user.id not in (
        issue.created_by,
        issue.assigned_to,
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only change the status of your own or assigned issues",
        )

    issue.status = data.status
    db.commit()
    db.refresh(issue)
    return issue
