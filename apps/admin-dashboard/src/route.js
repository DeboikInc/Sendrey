import { Routes, Route, } from "react-router-dom";
import Home from "./page/Home.jsx";
import Login from "./page/auth/Login.jsx";
import Register from "./page/auth/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";


export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/reg-admin" element={<Register />} />
            <Route element={<ProtectedRoute />}>
                <Route path="/home-admin" element={<Home />} />
                {/* Add more protected routes here */}
            </Route>
        </Routes>
    )
}