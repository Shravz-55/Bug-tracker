from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from . import models

ROLE_LEVEL = {"Viewer": 1, "Developer": 2, "Admin": 3}


def get_project_role(db: Session, user, project_id: int):
    if user.role == "Admin":
        return "Admin"

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id == user.id:
        return "Admin"

    member = (
        db.query(models.ProjectMember)
        .filter(
            models.ProjectMember.project_id == project_id,
            models.ProjectMember.user_id == user.id,
        )
        .first()
    )
    return member.role if member else None


def require_role(db: Session, user, project_id: int, minimum: str):
    role = get_project_role(db, user, project_id)

    if role is None or ROLE_LEVEL[role] < ROLE_LEVEL[minimum]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{minimum} access required for this action",
        )

    return role
