import { Link, Outlet } from 'react-router';

function App() {
	return (
		<div>
			<nav>
				<ul>
					<li>
						<Link to="/class-optimize">Class Optimize</Link>
					</li>
					<li>
						<Link to="/teacher-timetable">Teacher Timetable</Link>
					</li>
				</ul>
			</nav>
			<main>
				<Outlet />
			</main>
		</div>
	);
}

export default App;
