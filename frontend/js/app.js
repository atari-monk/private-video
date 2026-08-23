document.getElementById("createBtn").onclick = async () => {
    clearError();

    try {
        const data = await createSession();

        sessionToken = data.token;
        role = "host";

        const link =
            location.origin +
            location.pathname +
            "#" +
            sessionToken;

        history.replaceState(null, "", "#" + sessionToken);

        showSession();
        showStatus("waiting for participant");

        document.getElementById("copyBtn").onclick = async () => {
            try {
                await navigator.clipboard.writeText(link);
                document.getElementById("copyBtn").textContent = "Copied";
                setTimeout(() => {
                    document.getElementById("copyBtn").textContent =
                        "Copy session link";
                }, 1500);
            } catch (_) {
                showError(
                    new Error("Unable to copy the session link.")
                );
            }
        };

        await startWebRTC(
            sessionToken,
            role,
            showStatus,
            state => {
                if (!state.guest && role === "host")
                    showStatus("waiting for participant");
            }
        );
    } catch (error) {
        showError(error);
    }
};

document.getElementById("joinConfirmBtn").onclick = async () => {
    clearError();

    try {
        sessionToken = getToken(
            document.getElementById("sessionInput").value
        );

        if (!sessionToken)
            throw new Error("Enter a session link.");

        const data = await joinSession(sessionToken);

        role = data.role;

        showSession();
        showStatus("connecting");

        document.getElementById("copyBtn").hidden = true;

        await startWebRTC(
            sessionToken,
            role,
            showStatus
        );
    } catch (error) {
        showHome();
        showError(error);
    }
};

if (location.hash.length > 1) {
    document.getElementById("sessionInput").value =
        location.hash.slice(1);

    joinForm.hidden = false;
}