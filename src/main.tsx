import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import './index.css';
import App from './App.tsx';
import ClassOptimize from './pages/class-optimize.tsx';
import TeacherTimetable from './pages/teacher-timetable.tsx';

const router = createBrowserRouter(
	[
		{
			path: '/',
			element: <App />,
			children: [
				{
					path: 'class-optimize',
					element: <ClassOptimize />,
				},
				{
					path: 'teacher-timetable',
					element: <TeacherTimetable />,
				},
			],
		},
	],
	{
		future: {
			v7_startTransition: true,
			v7_relativeSplatPath: true,
		},
	},
);

function Router() {
	return <RouterProvider router={router} />;
}

createRoot(document.getElementById('root')!).render(<Router />);
