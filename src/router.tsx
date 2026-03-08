import { createBrowserRouter, Navigate } from 'react-router';
import MainLayout from './layouts/main-layout';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <MainLayout />,
		children: [
			{
				index: true,
				element: <Navigate to="/class-optimize" replace />,
			},
			{
				path: 'class-optimize',
				lazy: () => import('./pages/class-optimize'),
			},
			{
				path: 'teacher-timetable',
				lazy: () => import('./pages/teacher-timetable'),
			},
		],
	},
]);
