use worker::*;

mod flow;
mod indicators;
mod models;
mod sectors;
mod sectors_static;
mod stocks;
mod yahoo;

fn add_cors(resp: &mut Response) -> Result<()> {
    let h = resp.headers_mut();
    h.set("Access-Control-Allow-Origin", "*")?;
    h.set("Access-Control-Allow-Methods", "GET, OPTIONS")?;
    h.set("Access-Control-Allow-Headers", "Content-Type")?;
    Ok(())
}

#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    if req.method() == Method::Options {
        let mut resp = Response::ok("")?;
        add_cors(&mut resp)?;
        resp.headers_mut().set("Access-Control-Max-Age", "86400")?;
        return Ok(resp);
    }

    let mut resp = Router::new()
        .get_async("/api/stock/:symbol", stocks::get_stock)
        .get_async("/api/stock/:symbol/history", stocks::get_history)
        .get_async("/api/sectors", sectors::get_sectors)
        .get_async("/api/flow/unusual-volume", flow::get_unusual_volume)
        .get_async("/api/flow/top-turnover", flow::get_top_turnover)
        .get_async("/api/screener", flow::get_screener)
        .run(req, env)
        .await?;

    add_cors(&mut resp)?;
    Ok(resp)
}
