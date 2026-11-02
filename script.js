
document.addEventListener("DOMContentLoaded", () => {
    const functions = window.SkillSwapFunctions;

    const skillGrid = document.getElementById("skill-grid");
    const loadingMessage = document.getElementById("loading-message");
    const errorMessage = document.getElementById("error-message");

    let skills = [];

    // Convert API data into the format used by the existing functions.
    function normalizeSkill(skill) {
        return {
            ...skill,
            name: skill.name || skill.title || "Unnamed Skill",
            category: skill.category || "",
            price: Number(skill.price) || 0,
            description: skill.description || ""
        };
    }

    // Create and display skill cards.
    function displaySkills(skillList) {
        if (!skillGrid) return;

        skillGrid.replaceChildren();

        if (skillList.length === 0) {
            skillGrid.textContent = "No skills are currently available.";
            return;
        }

        skillList.forEach((skill, index) => {
            const card = document.createElement("article");
            card.className = "skill-card";
            card.dataset.category = skill.category;
            card.dataset.price = skill.price;

            const title = document.createElement("h3");
            title.textContent = skill.name;

            const category = document.createElement("p");
            category.textContent = `Category: ${skill.category}`;

            const description = document.createElement("p");
            description.textContent = skill.description;

            const price = document.createElement("p");
            price.textContent = `Price: $${skill.price.toFixed(2)} per session`;

            const button = document.createElement("button");
            button.className = "details-button";
            button.type = "button";
            button.textContent = "More Information";
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-controls", `skill-details-${index}`);

            const details = document.createElement("p");
            details.id = `skill-details-${index}`;
            details.className = "extra-details";
            details.textContent =
                `${skill.name} is available in the ${skill.category} category.`;
            details.hidden = true;

            card.append(title, category, description, price, button, details);
            skillGrid.appendChild(card);
        });
    }

    // Load skills from the backend database.
    async function loadSkills() {
        if (loadingMessage) loadingMessage.textContent = "Loading skills...";
        if (errorMessage) errorMessage.textContent = "";

        try {
            const data = await window.apiService.fetchSkills();

            // Support either an array or an object containing a skills array.
            const skillData = Array.isArray(data) ? data : data.skills;

            if (!Array.isArray(skillData)) {
                throw new Error("Unexpected skills API response.");
            }

            skills = skillData.map(normalizeSkill);
            displayMatchCategories();
            displayFilters();
            displaySkills(skills);

            // Refresh category filter results after loading new data.
            const activeFilter = document.querySelector(
                ".filter-button.active"
            );

            if (activeFilter) {
                filterSkills(activeFilter.dataset.category);
            }
        } catch (error) {
            console.error("Error loading skills:", error);

            if (errorMessage) {
                errorMessage.textContent =
                    "Unable to load skills. Make sure the backend is running.";
            }
        } finally {
            if (loadingMessage) loadingMessage.textContent = "";
        }
    }

    // Expand and collapse skill details.
    document.addEventListener("click", event => {
        const button = event.target.closest(".details-button");
        if (!button) return;

        const detailsId = button.getAttribute("aria-controls");
        const details = document.getElementById(detailsId);

        if (!details) return;

        const isExpanded =
            button.getAttribute("aria-expanded") === "true";

        details.hidden = isExpanded;
        button.setAttribute("aria-expanded", String(!isExpanded));
        button.textContent = isExpanded
            ? "More Information"
            : "Show Less";
    });

    // Generate category filters using categories from the API.
    function displayFilters() {
        const filterContainer = document.getElementById("skill-filters");

        if (!filterContainer) return;

        filterContainer.replaceChildren();

        const categories = [
            "All",
            ...new Set(
                skills
                    .map(skill => skill.category.trim())
                    .filter(category => category !== "")
            )
        ];

        categories.forEach(category => {
            const button = document.createElement("button");

            button.className = "filter-button";
            button.dataset.category = category;
            button.textContent = category;

            if (category === "All") {
                button.classList.add("active");
            }

            button.addEventListener("click", () => {
                filterSkills(category);
            });

            filterContainer.appendChild(button);
        });
    }

    function filterSkills(category) {
        const filtered = category === "All"
            ? skills
            : skills.filter(skill =>
                skill.category.trim().toLowerCase() ===
                category.trim().toLowerCase()
            );

        displaySkills(filtered);

        document.querySelectorAll(".filter-button").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.category === category
            );
        });
    }

    function displayMatchCategories() {
        const select = document.getElementById("needed-category");
        if (!select) return;

        select.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Choose a category";
        select.appendChild(defaultOption);

        const categories = [...new Set(
            skills.map(skill => skill.category.trim()).filter(Boolean)
        )];

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    }


    // Cost calculator.
    const costForm = document.getElementById("cost-form");

    if (costForm) {
        costForm.addEventListener("submit", event => {
            event.preventDefault();

            const rateInput = document.getElementById("hourly-rate");
            const hoursInput = document.getElementById("session-hours");
            const result = document.getElementById("cost-result");

            if (!rateInput || !hoursInput || !result) return;

            const rate = Number(rateInput.value);
            const hours = Number(hoursInput.value);

            if (
                rateInput.value.trim() === "" ||
                hoursInput.value.trim() === "" ||
                !Number.isFinite(rate) ||
                !Number.isFinite(hours) ||
                rate < 0 ||
                hours < 0
            ) {
                result.textContent = "Enter valid non-negative numbers.";
                return;
            }

            const total = functions
                ? functions.calculateTotalCost(rate, hours)
                : rate * hours;

            result.textContent = `Total cost: $${total.toFixed(2)}`;
        });
    }

    // Find my match.
    const matchForm = document.getElementById("match-form");

    if (matchForm) {
        matchForm.addEventListener("submit", event => {
            event.preventDefault();

            const category = document.getElementById("needed-category");
            const budget = document.getElementById("max-price");
            const results = document.getElementById("match-results");

            if (!category || !budget || !results) return;

            const maxPrice = Number(budget.value);

            if (
                budget.value.trim() === "" ||
                !Number.isFinite(maxPrice) ||
                maxPrice < 0
            ) {
                results.textContent = "Enter a valid non-negative budget.";
                return;
            }

            const matches = functions
                ? functions.matchSkillsToUser(
                    { category: category.value, maxPrice },
                    skills
                )
                : skills.filter(skill =>
                    skill.category === category.value &&
                    skill.price <= maxPrice
                );

            results.replaceChildren();

            if (matches.length === 0) {
                results.textContent =
                    "No skills match your category and budget.";
                return;
            }

            matches.forEach(skill => {
                const item = document.createElement("p");
                item.textContent =
                    `${skill.name} — $${skill.price.toFixed(2)} per session`;
                results.appendChild(item);
            });
        });
    }

    // Create a new skill in the backend database.
    const skillForm = document.getElementById("skill-form");

    if (skillForm) {
        skillForm.addEventListener("submit", async event => {
            event.preventDefault();

            const title = document.getElementById("title");
            const category = document.getElementById("category");
            const price = document.getElementById("price");
            const description = document.getElementById("description");
            const formMessage = document.getElementById("form-message");

            if (!title || !category || !price || !description) return;

            const skillData = {
                title: title.value.trim(),
                category: category.value.trim(),
                price: Number(price.value),
                description: description.value.trim()
            };

            if (
                !skillData.title ||
                !skillData.category ||
                !skillData.description ||
                price.value.trim() === "" ||
                !Number.isFinite(skillData.price) ||
                skillData.price < 0
            ) {
                formMessage.textContent = "Please enter valid skill information.";
                return;
            }

            try {
                await window.apiService.createSkill(skillData);

                skillForm.reset();
                formMessage.textContent = "Skill successfully added!";

                await loadSkills();
            } catch (error) {
                console.error("Error creating skill:", error);
                formMessage.textContent =
                    "Unable to add skill. Please try again.";
            }
        });
    }

    // Load the database skills when the page opens.
    loadSkills();
});
