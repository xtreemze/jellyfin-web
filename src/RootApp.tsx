import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { ApiProvider } from 'hooks/useApi';
import { UserSettingsProvider } from 'hooks/useUserSettings';
import { WebConfigProvider } from 'hooks/useWebConfig';
import { queryClient } from 'utils/query/queryClient';
import './components/visualizer/visualizers.scss';

import RootAppRouter from 'RootAppRouter';

const RootApp = () => (
    <QueryClientProvider client={queryClient}>
        <ApiProvider>
            <UserSettingsProvider>
                <WebConfigProvider>
                    <RootAppRouter />
                </WebConfigProvider>
            </UserSettingsProvider>
        </ApiProvider>
    </QueryClientProvider>
);

export default RootApp;
