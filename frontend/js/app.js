document.getElementById("createBtn").onclick = async () => {
    try {
        const data = await createSession();

        sessionToken = data.token;
        role = "host";

        const link = location.origin + location.pathname + "#" + sessionToken;
        history.replaceState(null, "", "#" + sessionToken);

        await startWebRTC(sessionToken, role, showStatus);
        showSession();

        document.getElementById("copyBtn").onclick = () =>
            navigator.clipboard.writeText(link);
    } catch (error) {
        showError(error);
    }
};

document.getElementById("joinConfirmBtn").onclick = async () => {
    try {
        sessionToken = getToken(document.getElementById("sessionInput").value);

        if (!sessionToken) throw new Error("Enter a session link.");

        const data = await joinSession(sessionToken);
        role = data.role;

        await startWebRTC(sessionToken, role, showStatus);
        showSession();

        document.getElementById("copyBtn").hidden = true;
    } catch (error) {
        showError(error);
    }
};

if (location.hash.length > 1) {
    document.getElementById("sessionInput").value = location.hash.slice(1);
    joinForm.hidden = false;
}