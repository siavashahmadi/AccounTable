from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .partnerships import router as partnerships_router
from .goals import router as goals_router
from .checkins import router as checkins_router
from .messages import router as messages_router
from .progress import router as progress_router
from .notifications import router as notifications_router

router = APIRouter()

# Include all sub-routers
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(partnerships_router)
router.include_router(goals_router)
router.include_router(checkins_router)
router.include_router(messages_router)
router.include_router(progress_router)
router.include_router(notifications_router) 