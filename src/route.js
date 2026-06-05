import { Routes, Route, } from "react-router-dom";
import Home from "./page/Home";
import Login from "./page/auth/Login";
import Register from "./page/auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";


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