import { RouteObject, redirect } from 'react-router-dom';
import React from 'react';

import ConnectionRequired from 'components/ConnectionRequired';
import { toAsyncPageRoute } from 'components/router/AsyncRoute';
import { toViewManagerPageRoute } from 'components/router/LegacyRoute';
import { toRedirectRoute } from 'components/router/Redirect';
import ErrorBoundary from 'components/router/ErrorBoundary';

import AppLayout from '../AppLayout';

import { REDIRECTS } from './_redirects';
import { ASYNC_USER_ROUTES } from './asyncRoutes';
import { LEGACY_PUBLIC_ROUTES, LEGACY_USER_ROUTES } from './legacyRoutes';
import BangRedirect from 'components/router/BangRedirect';

export const STABLE_APP_ROUTES: RouteObject[] = [
    {
        path: '/*',
        Component: AppLayout,
        children: [
            {
                /* User routes */
                element: <ConnectionRequired isUserRequired />,
                children: [
                    ...ASYNC_USER_ROUTES.map(toAsyncPageRoute),
                    ...LEGACY_USER_ROUTES.map(toViewManagerPageRoute)
                ],
                ErrorBoundary
            },

            /* Public routes */
            { index: true, loader: () => redirect('/home.html') },
            ...LEGACY_PUBLIC_ROUTES.map(toViewManagerPageRoute)
        ]
    },

    {
        path: '!/*',
        Component: BangRedirect
    },

    /* Redirects for old paths */
    ...REDIRECTS.map(toRedirectRoute)
];
