// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
	"use strict";

	// Fetch all the forms we want to apply custom Bootstrap validation styles to
	const forms = document.querySelectorAll(".needs-validation");

	// Loop over them and prevent submission
	Array.from(forms).forEach((form) => {
		form.addEventListener(
			"submit",
			(event) => {
				if (!form.checkValidity()) {
					event.preventDefault();
					event.stopPropagation();
				}

				form.classList.add("was-validated");
			},
			false
		);
	});
})();

// Theme switching logic
const themeBtn = document.getElementById("theme-btn");
const currentTheme = localStorage.getItem("theme");

if (currentTheme) {
	document.documentElement.setAttribute("data-theme", currentTheme);
	if (currentTheme === "dark") {
		themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
	}
}

themeBtn.addEventListener("click", () => {
	let theme = document.documentElement.getAttribute("data-theme");
	if (theme === "dark") {
		document.documentElement.setAttribute("data-theme", "light");
		localStorage.setItem("theme", "light");
		themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
	} else {
		document.documentElement.setAttribute("data-theme", "dark");
		localStorage.setItem("theme", "dark");
		themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
	}
});
