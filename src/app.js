const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use("/static", express.static(path.join(__dirname, "../static")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.get("/", (req, res) => {
    res.status(200).render("index.ejs");
});

app.get("/signup", (req, res) => {
    res.status(200).render("signup.ejs");
});

app.get("/dashboard", (req, res) => {
    res.status(200).render("dashboard/dashboard.ejs");
});

app.get("/privacy", (req, res) => {
    res.status(200).render("privacy.ejs");
});

app.post("/signup", (req, res) => {
    res.redirect("/"); 
});
app.post("/login", (req, res) => {
    res.redirect("/");
});

app.use((req, res) => {
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`The application started successfully on port ${port}`);
});