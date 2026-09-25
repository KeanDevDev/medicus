"""
Authentication and Role-Based Access Control (RBAC) Service
Medicus: Federated AI Control Tower for India's Public Health Supply Chain
"""

import os
import datetime
from typing import Optional
import sqlite3
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.environ.get("MEDICUS_JWT_SECRET", "medicus-secure-jwt-secret-key-2026-public-health-grid")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hashes a plain password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Encodes JWT payload with expiration."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def authenticate_user(username: str, password: str, conn: sqlite3.Connection) -> Optional[dict]:
    """
    Authenticates user credentials against the database.
    Supports flexible login by username, phc_id, or case-insensitive identifiers.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT user_id, username, password_hash, full_name, role, phc_id
        FROM users
        WHERE LOWER(username) = LOWER(?) OR LOWER(phc_id) = LOWER(?)
    """, (username.strip(), username.strip()))
    user_row = cursor.fetchone()
    if not user_row:
        return None
    
    user_dict = dict(user_row)
    if not verify_password(password, user_dict["password_hash"]):
        return None
        
    del user_dict["password_hash"]
    return user_dict

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    """FastAPI dependency to extract and verify the current authenticated user."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return {
        "user_id": user_id,
        "username": payload.get("username"),
        "role": payload.get("role"),
        "full_name": payload.get("full_name"),
        "phc_id": payload.get("phc_id")
    }

def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """FastAPI dependency returning current user if token provided, otherwise None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials)
    except Exception:
        return None

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency requiring the admin role."""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required for this operational command."
        )
    return user

def require_phc_user(user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency requiring an authenticated PHC user (or admin acting with oversight)."""
    if user.get("role") not in ("phc_operator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PHC operator credentials required."
        )
    return user

def validate_phc_data_scope(target_phc_id: str, user: dict):
    """
    Enforces strict data isolation:
    Admin has global oversight; PHC operator can strictly only access/modify their assigned PHC.
    """
    if user.get("role") == "admin":
        return True
    if user.get("role") == "phc_operator" and user.get("phc_id") == target_phc_id:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access Denied: You do not have authorization to view or modify data for facility {target_phc_id}."
    )
