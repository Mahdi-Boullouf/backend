import express , {Request,Response} from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import router from "./router";
import { errorMiddleware } from "./middlewares/error";
import { initSocket } from "./socket";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.get("/", (req: Request, res: Response) => {
    res.send({"message":"All is good"});
});
app.use(router)
app.use(errorMiddleware);

const httpServer = createServer(app);
initSocket(httpServer);

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});