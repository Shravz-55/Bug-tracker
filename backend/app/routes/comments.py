from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.core.security import get_current_user
from app.permissions import require_role


router = APIRouter(
    prefix="/issues",
    tags=["Comments"]
)


@router.post("/{issue_id}/comments", response_model=schemas.CommentResponse)
def add_comment(
    issue_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = db.query(models.Issue).filter(
        models.Issue.id == issue_id
    ).first()

    if issue is None:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    require_role(db, current_user, issue.project_id, "Developer")

    new_comment = models.Comment(
        content=comment.content,
        issue_id=issue_id,
        user_id=current_user.id
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return new_comment


@router.get("/{issue_id}/comments", response_model=list[schemas.CommentResponse])
def get_comments(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    issue = db.query(models.Issue).filter(
        models.Issue.id == issue_id
    ).first()

    if issue is None:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    require_role(db, current_user, issue.project_id, "Viewer")

    comments = db.query(models.Comment).filter(
        models.Comment.issue_id == issue_id
    ).order_by(models.Comment.id.asc()).all()

    return comments

