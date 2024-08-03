
import React from 'react';
import {
    RouterProvider,
    createHashRouter,
    Outlet,
    useLocation
} from 'react-router-dom';

import { DASHBOARD_APP_PATHS, DASHBOARD_APP_ROUTES } from 'apps/dashboard/routes/routes';
import { EXPERIMENTAL_APP_ROUTES } from 'apps/experimental/routes/routes';
import { STABLE_APP_ROUTES } from 'apps/stable/routes/routes';
import AppHeader from 'components/AppHeader';
import Backdrop from 'components/Backdrop';
import { createRouterHistory } from 'components/router/routerHistory';
import UserThemeProvider from 'themes/UserThemeProvider';
import Visualizers from 'components/visualizer/Visualizers';

const layoutMode = localStorage.getItem('layout');
const isExperimentalLayout = layoutMode === 'experimental';

const router = createHashRouter([
    {
        element: <RootAppLayout />,
        children: [
            ...(isExperimentalLayout ? EXPERIMENTAL_APP_ROUTES : STABLE_APP_ROUTES),
            ...DASHBOARD_APP_ROUTES
        ]
    }
]);

export const history = createRouterHistory(router);

export default function RootAppRouter() {
    return <RouterProvider router={router} />;
}

/**
 * Layout component that renders legacy components required on all pages.
 * NOTE: The app will crash if these get removed from the DOM.
 */
function RootAppLayout() {
    const location = useLocation();
    const isNewLayoutPath = Object.values(DASHBOARD_APP_PATHS)
        .some(path => location.pathname.startsWith(`/${path}`));

    return (
        <UserThemeProvider>
            <Visualizers />
            <Backdrop />
            <AppHeader isHidden={isExperimentalLayout || isNewLayoutPath} />

            <Outlet />
        </UserThemeProvider>
    );
}
