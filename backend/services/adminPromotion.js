async function promoteExistingUser(User, email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { status: "invalid_email" };
    }

    const user = await User.findOne({ email: normalizedEmail }).select("_id role status");
    if (!user) return { status: "not_found" };
    if (user.role === "admin") return { status: "already_admin" };
    if (user.status !== "active") return { status: "inactive" };

    const updated = await User.findOneAndUpdate(
        { _id: user._id, role: user.role },
        { $set: { role: "admin" } },
        { returnDocument: "after", runValidators: true }
    ).select("name email role");

    if (!updated) return { status: "changed" };
    return { status: "promoted", user: updated };
}

module.exports = { promoteExistingUser };
