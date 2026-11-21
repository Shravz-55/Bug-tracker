from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.core.security import get_current_user
from app.permissions import require_role

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


@router.post("/", response_model=schemas.ProjectResponse)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_project = models.Project(
        name=project.name,
        description=project.description,
        owner_id=current_user.id
    )

    db.add(new_project)
    db.flush()

    db.add(models.ProjectMember(
        project_id=new_project.id,
        user_id=current_user.id,
        role="Admin",
    ))

    db.commit()
    db.refresh(new_project)

    return new_project


@router.get("/", response_model=list[schemas.ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "Admin":
        return db.query(models.Project).all()

    projects = (
        db.query(models.Project)
        .outerjoin(
            models.ProjectMember,
            models.ProjectMember.project_id == models.Project.id
        )
        .filter(
            (models.Project.owner_id == current_user.id)
            | (models.ProjectMember.user_id == current_user.id)
        )
        .distinct()
        .all()
    )

    return projects


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    require_role(db, current_user, project_id, "Viewer")
    return project


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    project_data: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    require_role(db, current_user, project_id, "Admin")

    project.name = project_data.name
    project.description = project_data.description

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    if project.owner_id != current_user.id and current_user.role != "Admin":
        raise HTTPException(
            status_code=403,
            detail="Only the project owner can delete it"
        )

    issue_count = db.query(models.Issue).filter(
        models.Issue.project_id == project_id
    ).count()

    if issue_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete project because it contains issues"
        )

    db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id
    ).delete()

    db.delete(project)
    db.commit()

    return {
        "message": "Project deleted successfully"
    }

