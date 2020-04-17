const router = require("express").Router();
const auth = require("../../middleware/auth");
const Project = require("../../models/Project");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");

/**
 * @route       GET api/projects
 * @description Return projects of reuest user
 * @access      Private
 */
router.get("/", auth, async (req, res) => {
  try {
    const { id } = req.user;
    const projects = await Project.find({
      $or: [{ users: id }, { admins: id }],
    });

    if (!projects) {
      return res.status(400).json({ msg: "No projects found." });
    }

    res.json(projects);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

/**
 * @route       POST api/projects
 * @description Create or update project
 * @access      Private
 */
router.post("/", [auth, [check("name").not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;
  const { id } = req.user;

  try {
    let project = await Project.findOne({ $and: [{ name }, { users: id }] });

    if (project) {
      return res
        .status(400)
        .send("User already belong to a project with same name");
    }

    // Create project
    project = new Project({
      name,
      users: [id],
      admins: [id],
    });
    await project.save();

    // TODO: update user's projects list
    await User.findOneAndUpdate(
      { _id: id },
      { projects: project.id },
      { new: true }
    );

    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error.");
  }
});

/**
 * @route       DELETE api/projects
 * @description Delete a post
 * @access      Private
 */
router.delete(
  "/",
  [auth, [check("name").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const { id } = req.user;

    try {
      await Project.findOneAndRemove({ $and: [{ name }, { admins: id }] });
      res.json("Project deleted");
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
