from sqlalchemy.orm import Session
from datetime import datetime
import json
import uuid
from typing import Dict, Any, List, Optional

from database.models import (
    ChatSession, 
    ChatMessage, 
    ResponseValidation, 
    PromptImprovement, 
    CodeSnapshot,
    ResponseValidationStatus
)

class ChatbotDBOperations:
    def __init__(self, db: Session):
        self.db = db
    
    def create_chat_session(self, student_id: uuid.UUID, problem_id: int) -> ChatSession:
        """Create a new chat session for a student working on a problem."""
        session = ChatSession(
            student_id=student_id,
            problem_id=problem_id
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def end_chat_session(self, session_id: uuid.UUID, summary: str = None) -> None:
        """End a chat session and optionally add a summary."""
        session = self.db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session:
            session.end_time = datetime.utcnow()
            if summary:
                session.session_summary = summary
            self.db.commit()
    
    def add_student_message(self, session_id: uuid.UUID, content: str) -> ChatMessage:
        """Add a message from the student to the chat session."""
        message = ChatMessage(
            session_id=session_id,
            is_from_student=True,
            content=content
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message
    
    def add_ai_message(
        self, 
        session_id: uuid.UUID, 
        content: str,
        was_validated: bool = False,
        validation_status: ResponseValidationStatus = None,
        validation_attempts: int = 0
    ) -> ChatMessage:
        """Add a message from the AI to the chat session with validation info."""
        message = ChatMessage(
            session_id=session_id,
            is_from_student=False,
            content=content,
            was_validated=was_validated,
            validation_status=validation_status,
            validation_attempts=validation_attempts
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message
    
    def add_code_snapshot(self, session_id: uuid.UUID, code: str, ai_feedback: str = None) -> CodeSnapshot:
        """Add a code snapshot to the chat session."""
        snapshot = CodeSnapshot(
            session_id=session_id,
            code=code,
            ai_feedback=ai_feedback
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot
    
    def record_response_validation(
        self,
        message_id: uuid.UUID,
        attempt_number: int,
        original_content: str,
        validation_result: bool,
        feedback: Dict[str, Any] = None,
        improved_content: str = None
    ) -> ResponseValidation:
        """Record a validation attempt for an AI response."""
        validation = ResponseValidation(
            message_id=message_id,
            attempt_number=attempt_number,
            original_content=original_content,
            validation_result=validation_result,
            feedback=feedback,
            improved_content=improved_content
        )
        self.db.add(validation)
        self.db.commit()
        self.db.refresh(validation)
        return validation
    
    def add_prompt_improvement(
        self,
        validation_id: uuid.UUID,
        instruction: str,
        is_active: bool = True
    ) -> PromptImprovement:
        """Add a prompt improvement based on validation feedback."""
        improvement = PromptImprovement(
            validation_id=validation_id,
            instruction=instruction,
            is_active=is_active,
            last_used_at=datetime.utcnow()
        )
        self.db.add(improvement)
        self.db.commit()
        self.db.refresh(improvement)
        return improvement
    
    def get_active_prompt_improvements(self) -> List[PromptImprovement]:
        """Get all currently active prompt improvements."""
        return self.db.query(PromptImprovement).filter(PromptImprovement.is_active == True).all()
    
    def update_prompt_improvement_effectiveness(
        self, 
        improvement_id: uuid.UUID, 
        effectiveness_delta: float
    ) -> None:
        """Update the effectiveness score of a prompt improvement."""
        improvement = self.db.query(PromptImprovement).filter(
            PromptImprovement.id == improvement_id
        ).first()
        
        if improvement:
            improvement.effectiveness_score += effectiveness_delta
            improvement.last_used_at = datetime.utcnow()
            self.db.commit()
    
    def get_chat_history(self, session_id: uuid.UUID) -> List[ChatMessage]:
        """Get the complete chat history for a session."""
        return self.db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp).all()
    
    def get_code_snapshots(self, session_id: uuid.UUID) -> List[CodeSnapshot]:
        """Get all code snapshots for a session."""
        return self.db.query(CodeSnapshot).filter(
            CodeSnapshot.session_id == session_id
        ).order_by(CodeSnapshot.timestamp).all()