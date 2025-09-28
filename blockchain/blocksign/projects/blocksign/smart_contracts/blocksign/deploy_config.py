# smart_contracts/blocksign/deploy_config.py
from __future__ import annotations

import logging
import os
from typing import Optional

import algokit_utils

logger = logging.getLogger(__name__)


def _parse_on_update(value: Optional[str]) -> algokit_utils.OnUpdate:
    v = (value or "AppendApp").strip()
    mapping = {
        "AppendApp": algokit_utils.OnUpdate.AppendApp,
        "ReplaceApp": algokit_utils.OnUpdate.ReplaceApp,
        "UpdateApp": algokit_utils.OnUpdate.UpdateApp,
        "Fail": algokit_utils.OnUpdate.Fail,
    }
    return mapping.get(v, algokit_utils.OnUpdate.AppendApp)


def _parse_on_schema_break(value: Optional[str]) -> algokit_utils.OnSchemaBreak:
    v = (value or "AppendApp").strip()
    mapping = {
        "AppendApp": algokit_utils.OnSchemaBreak.AppendApp,
        "ReplaceApp": algokit_utils.OnSchemaBreak.ReplaceApp,
        "Fail": algokit_utils.OnSchemaBreak.Fail,
    }
    return mapping.get(v, algokit_utils.OnSchemaBreak.AppendApp)


def deploy() -> None:
    """
    Ortam değişkenleri:
      DEPLOYER_ENV_NAME  (default: DEPLOYER)
      ON_UPDATE          (AppendApp | ReplaceApp | UpdateApp | Fail) default: AppendApp
      ON_SCHEMA_BREAK    (AppendApp | ReplaceApp | Fail)             default: AppendApp
      FUND_APP_ALGO      (float, ALGO cinsinden; default: 1.0; 0/boş = funding yok)
    """
    # Typed client (build sonrası artifacts):
    from smart_contracts.artifacts.blocksign.blocksign_client import BlocksignFactory  # type: ignore

    # Hesap / ağ
    deployer_env_name = os.getenv("DEPLOYER_ENV_NAME", "DEPLOYER")
    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment(deployer_env_name)

    # Typed factory
    factory = algorand.client.get_typed_app_factory(
        BlocksignFactory, default_sender=deployer.address
    )

    on_update = _parse_on_update(os.getenv("ON_UPDATE"))
    on_schema_break = _parse_on_schema_break(os.getenv("ON_SCHEMA_BREAK"))

    # Deploy
    app_client, result = factory.deploy(
        on_update=on_update,
        on_schema_break=on_schema_break,
    )

    logger.info(
        "Deployed %s (app_id=%s) op=%s",
        app_client.app_name,
        app_client.app_id,
        getattr(result.operation_performed, "name", result.operation_performed),
    )

    # Create/Replace ise opsiyonel funding
    try:
        fund_algo = float(os.getenv("FUND_APP_ALGO", "1.0"))
    except ValueError:
        fund_algo = 1.0

    if result.operation_performed in (
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ):
        if fund_algo and fund_algo > 0:
            algorand.send.payment(
                algokit_utils.PaymentParams(
                    amount=algokit_utils.AlgoAmount(algo=fund_algo),
                    sender=deployer.address,
                    receiver=app_client.app_address,
                )
            )
            logger.info(
                "Funded %s (app_id=%s) with %.3f ALGO",
                app_client.app_name,
                app_client.app_id,
                fund_algo,
            )
