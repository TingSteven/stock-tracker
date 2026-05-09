use axum::{routing::get, Router};
use tower_http::cors::{Any, CorsLayer};

mod api;
mod models;
mod services;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/stock/:symbol", get(api::stocks::get_stock))
        .route("/api/stock/:symbol/history", get(api::stocks::get_history))
        .route("/api/sectors", get(api::sectors::get_sectors))
        .route("/api/flow/unusual-volume", get(api::flow::get_unusual_volume))
        .route("/api/flow/top-turnover", get(api::flow::get_top_turnover))
        .route("/api/screener", get(api::flow::get_screener))
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("Failed to bind port 8080");

    println!("Backend running at http://localhost:8080");
    axum::serve(listener, app).await.unwrap();
}
